using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http.Controllers;
using System.Web.Mvc;
using JetBrains.Annotations;
using NGM.CasClient.Client;
using NGM.CasClient.Client.Extensions;
using Orchard;
using Orchard.Localization;
using Orchard.Logging;
using Orchard.Mvc.Filters;
using System.Collections.Generic;
using Orchard.UI.Admin;
using System.Linq;

namespace NGM.CasClient.Filters {
    [UsedImplicitly]
    public class CasAuthorizationFilter : FilterProvider, IAuthorizationFilter, IHttpAuthorizationFilter {
        private readonly ICASClient _casClient;
        private readonly ICasServices _casServices;
        private readonly IRequestEvaluator _requestEvaluator;

        public CasAuthorizationFilter(
            ICASClient casClient,
            ICasServices casServices,
            IRequestEvaluator requestEvaluator) {
            _casClient = casClient;
            _casServices = casServices;
            _requestEvaluator = requestEvaluator;
            Logger = NullLogger.Instance;
            T = NullLocalizer.Instance;
        }

        public ILogger Logger { get; set; }
        public Localizer T { get; set; }

        public void OnAuthorization(AuthorizationContext filterContext) {
            if (!_casServices.Settings.IsConfigured()) {
                Logger.Debug("CAS is not configured correctly");
                return;
            }
            
            var workContext = filterContext.RequestContext.GetWorkContext();

            ProcessAuthorization(workContext.HttpContext);

            if ((workContext.HttpContext.User == null || !workContext.HttpContext.User.Identity.IsAuthenticated) && IsAdmin(filterContext))
                filterContext.Result = _casClient.RedirectToLoginPage();

        }

        private static bool IsAdmin(AuthorizationContext filterContext)
        {
            if (IsNameAdmin(filterContext) || IsNameAdminProxy(filterContext))
            {
                return true;
            }

            var adminAttributes = GetAdminAttributes(filterContext.ActionDescriptor);
            if (adminAttributes != null && adminAttributes.Any())
            {
                return true;
            }
            return false;
        }

        private static bool IsNameAdmin(AuthorizationContext filterContext)
        {
            return string.Equals(filterContext.ActionDescriptor.ControllerDescriptor.ControllerName, "Admin",
                                 StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsNameAdminProxy(AuthorizationContext filterContext)
        {
            return filterContext.ActionDescriptor.ControllerDescriptor.ControllerName.StartsWith(
                "AdminControllerProxy", StringComparison.InvariantCultureIgnoreCase) &&
                filterContext.ActionDescriptor.ControllerDescriptor.ControllerName.Length == "AdminControllerProxy".Length + 32;
        }

        private static IEnumerable<AdminAttribute> GetAdminAttributes(ActionDescriptor descriptor)
        {
            return descriptor.GetCustomAttributes(typeof(AdminAttribute), true)
                .Concat(descriptor.ControllerDescriptor.GetCustomAttributes(typeof(AdminAttribute), true))
                .OfType<AdminAttribute>();
        }

        public bool AllowMultiple {
            get { return false; }
        }

        public Task<HttpResponseMessage> ExecuteAuthorizationFilterAsync(HttpActionContext actionContext, CancellationToken cancellationToken,
            Func<Task<HttpResponseMessage>> continuation) {

                var workContext = actionContext.ControllerContext.GetWorkContext();

                ProcessAuthorization(workContext.HttpContext);

                return continuation();
        }

        private void ProcessAuthorization(HttpContextBase httpContext) {
            if (!_requestEvaluator.GetRequestIsAppropriateForCasAuthentication(httpContext)) {
                Logger.Debug("No EndRequest processing for {0}", httpContext.Request.RawUrl);
                return;
            }

            if (_requestEvaluator.GetRequestHasCasTicket(httpContext)) {
                Logger.Information("Processing Proxy Callback request");
                _casClient.ProcessTicketValidation(httpContext);
            }

            Logger.Debug("Starting AuthenticateRequest for {0}", httpContext.Request.RawUrl);
            _casClient.ProcessRequestAuthentication(httpContext);
            Logger.Debug("Ending AuthenticateRequest for {0}", httpContext.Request.RawUrl);
        }
    }
}