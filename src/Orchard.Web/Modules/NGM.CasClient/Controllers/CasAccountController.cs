using NGM.CasClient.Client;
using NGM.CasClient.Client.Security;
using NGM.CasClient.Models;
using Orchard.Security;
using Orchard.UI.Admin;
using System;
using System.Collections.Generic;
using System.Configuration;
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

        [AlwaysAccessible]
        public void LogOff()
        {
            _casClient.SingleSignOut(HttpContext);
        }

        [AlwaysAccessible]
        public JsonResult CasAuthTicket(String Id)
        {

            var AuthKey = Request.Headers["FederatedKey"] ?? String.Empty;

            if (AuthKey == ConfigurationManager.AppSettings["FederatedKey"] && HttpContext.Cache[Id] != null)
            {
                var Ticket = HttpContext.Cache[Id] as CasAuthenticationTicket;

                var Payload = new CasFederatedModel
                {
                    serviceTicket = Ticket.ServiceTicket,
                    originatingServiceName = Ticket.OriginatingServiceName,
                    clientHostAddress = Ticket.ClientHostAddress,
                    assertion = Ticket.Assertion as Assertion,
                    attributes = Ticket.MaxAttributes
                };

                return Json(Payload, JsonRequestBehavior.AllowGet);
            }

            return Json(String.Empty, JsonRequestBehavior.AllowGet);

        }

        public JsonResult Logout(String Id)
        {

            if (HttpContext.Cache[Id] != null)
                HttpContext.Cache.Remove(Id);

            return Json("Success", JsonRequestBehavior.AllowGet);

        }

    }
}