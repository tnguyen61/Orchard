﻿using System;
using System.Linq;
using System.Web;
using System.Web.Security;
using NGM.CasClient.Client.Security;
using Orchard.ContentManagement;
using Orchard.Environment.Configuration;
using Orchard.Environment.Extensions;
using Orchard.Logging;
using Orchard.Mvc;
using Orchard.Security;
using Orchard.Services;
using Orchard.Users.Models;
using NGM.CasClient.Models;

namespace NGM.CasClient.Services {
    [OrchardSuppressDependency("Orchard.Security.Providers.FormsAuthenticationService")]
    public class CASAuthenticationService : IAuthenticationService {
        private readonly ShellSettings _settings;
        private readonly IClock _clock;
        private readonly IContentManager _contentManager;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ICasIdentityRetriever _casIdentityRetriever;
        private IUser _signedInUser;
        private bool _isAuthenticated = false;

        public CASAuthenticationService(ShellSettings settings, 
            IClock clock, 
            IContentManager contentManager, 
            IHttpContextAccessor httpContextAccessor,
            ICasIdentityRetriever casIdentityRetriever) {
            _settings = settings;
            _clock = clock;
            _contentManager = contentManager;
            _httpContextAccessor = httpContextAccessor;
            _casIdentityRetriever = casIdentityRetriever;

            Logger = NullLogger.Instance;

            ExpirationTimeSpan = TimeSpan.FromDays(30);
        }

        public ILogger Logger { get; set; }

        public TimeSpan ExpirationTimeSpan { get; set; }

        public void SignIn(IUser user, bool createPersistentCookie) {
            var now = _clock.UtcNow.ToLocalTime();

            // the cookie user data is {userId};{tenant}
            var userData = String.Concat(Convert.ToString(user.Id), ";", _settings.Name);

            var ticket = new FormsAuthenticationTicket(
                1 /*version*/,
                user.UserName,
                now,
                now.Add(ExpirationTimeSpan),
                createPersistentCookie,
                userData,
                FormsAuthentication.FormsCookiePath);

            var encryptedTicket = FormsAuthentication.Encrypt(ticket);

            var cookie = new HttpCookie(FormsAuthentication.FormsCookieName, encryptedTicket) {
                HttpOnly = true,
                Secure = FormsAuthentication.RequireSSL,
                Path = FormsAuthentication.FormsCookiePath
            };

            var httpContext = _httpContextAccessor.Current();

            if (!String.IsNullOrEmpty(_settings.RequestUrlPrefix)) {
                cookie.Path = GetCookiePath(httpContext);
            }

            if (FormsAuthentication.CookieDomain != null) {
                cookie.Domain = FormsAuthentication.CookieDomain;
            }

            if (createPersistentCookie) {
                cookie.Expires = ticket.Expiration;
            }

            httpContext.Response.Cookies.Add(cookie);

            _isAuthenticated = true;
            _signedInUser = user;
        }

        public void SignOut() {
            _signedInUser = null;
            _isAuthenticated = false;
            FormsAuthentication.SignOut();

            // overwritting the authentication cookie for the given tenant
            var httpContext = _httpContextAccessor.Current();
            var rFormsCookie = new HttpCookie(FormsAuthentication.FormsCookieName, "") {
                Expires = DateTime.Now.AddYears(-1),
            };

            if (!String.IsNullOrEmpty(_settings.RequestUrlPrefix)) {
                rFormsCookie.Path = GetCookiePath(httpContext);
            }

            httpContext.Response.Cookies.Add(rFormsCookie);
        }

        public void SetAuthenticatedUserForRequest(IUser user) {
            _signedInUser = user;
            _isAuthenticated = true;
        }

        public IUser GetAuthenticatedUser() {
            if (_signedInUser != null || _isAuthenticated)
                return _signedInUser;

            var httpContext = _httpContextAccessor.Current();
            if (httpContext == null || !httpContext.Request.IsAuthenticated)
                return null;

            if (httpContext.User.Identity is FormsIdentity) {
                var formsIdentity = (FormsIdentity)httpContext.User.Identity;
                var userData = formsIdentity.Ticket.UserData ?? "";

                // the cookie user data is {userId};{tenant}
                var userDataSegments = userData.Split(';');

                if (userDataSegments.Length != 2) {
                    return null;
                }

                var userDataId = userDataSegments[0];
                var userDataTenant = userDataSegments[1];

                if (!String.Equals(userDataTenant, _settings.Name, StringComparison.Ordinal)) {
                    return null;
                }

                int userId;
                if (!int.TryParse(userDataId, out userId)) {
                    Logger.Fatal("User id not a parsable integer");
                    return null;
                }

                _isAuthenticated = true;
                return _signedInUser = _contentManager.Get(userId).As<IUser>();
            }
            else if (httpContext.User is CasPrincipal) {

                using (var context = new OrchardEntities())
                {

                    var casPrincipal = (CasPrincipal)httpContext.User;

                    var UserAccount = context.Orchard_Users_UserPartRecord.FirstOrDefault(x => x.Email.ToLower() == casPrincipal.MaxAttributes.EmailAddress.ToLower());
                    
                    if (UserAccount == null)
                        UserAccount = context.Orchard_Users_UserPartRecord.FirstOrDefault(x => x.UserName == "DefaultAccountDoNotDelete");

                    var orchardUser = _contentManager.Query("User").List().Select(x => x.As<IUser>()).First(x => x.Email.ToLower() == UserAccount.Email.ToLower());
                    
                    return orchardUser;

                }
                
            }
            return null;
        }

        private string GetCookiePath(HttpContextBase httpContext) {
            var cookiePath = httpContext.Request.ApplicationPath;
            if (cookiePath != null && cookiePath.Length > 1) {
                cookiePath += '/';
            }

            cookiePath += _settings.RequestUrlPrefix;

            return cookiePath;
        }
    }
}