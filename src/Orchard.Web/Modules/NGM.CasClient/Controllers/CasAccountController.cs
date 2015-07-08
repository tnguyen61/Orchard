using NGM.CasClient.Client;
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
        private readonly ICASClient _casClient;


        public CasAccountController(
            IAuthenticationService authenticationService,
            ICASClient casClient
        ){
            _authenticationService = authenticationService;
            _casClient = casClient;
        }

        [AlwaysAccessible]
        public RedirectResult LogOn() {
            if (_authenticationService.GetAuthenticatedUser() != null)
                return Redirect("~/");

            return _casClient.RedirectToLoginPage();
        }
    }
}