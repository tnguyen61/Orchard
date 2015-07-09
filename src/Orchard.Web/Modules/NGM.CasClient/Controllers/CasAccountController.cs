using Orchard.Security;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace NGM.CasClient.Controllers
{
    public class CasAccountController : Controller
    {
        private readonly IAuthenticationService _authenticationService;


        public CasAccountController(
            IAuthenticationService authenticationService
        ){
            _authenticationService = authenticationService;
        }

        [AlwaysAccessible]
        public RedirectResult LogOn() {
            if (_authenticationService.GetAuthenticatedUser() != null)
                return Redirect("~/");

            return new RedirectResult(DotNetCasClient.CasAuthentication.CasServerLoginUrl); //TODO pull form settings???
        }
    }
}