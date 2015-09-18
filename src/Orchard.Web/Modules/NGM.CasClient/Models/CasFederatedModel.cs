using NGM.CasClient.Client.Security;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace NGM.CasClient.Models
{
    public class CasFederatedModel
    {

        public string serviceTicket { get; set; }
        public string originatingServiceName { get; set; }
        public string clientHostAddress { get; set; }
        public Assertion assertion { get; set; }
        public maxAttributes attributes { get; set; }


    }
}