using NGM.CasClient.Client.Security;
using Orchard.ContentManagement;
using Orchard.Roles.Models;
using Orchard.Security;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace NGM.CasClient.Models {
    public class CASUser : ContentItem, IUser, IUserRoles {
        public string UserName { get; private set; }

        public string Email { get; private set; }

        public ContentItem ContentItem {
            get { return this; }
        }

        public int Id {
            get { return -1; }
        }

        public IList<string> Roles { get; private set; }

        private CASUser() { }

        public static CASUser Get(ICasPrincipal principal) {
            if(principal == null)
                throw new ArgumentNullException();

            var user = new CASUser() { };

            user.Email = principal.MaxAttributes.EmailAddress;

           

            using (var db = new MemberEntities()) {
                var username = user.Email.ToLowerInvariant();

                user.Roles = new List<string>();

                if (db.aspnet_Users.Where(u => u.LoweredUserName == username).SelectMany(x => x.aspnet_Roles).Any(x => x.RoleName == "CMS"))
                    user.Roles.Add("Administrator");
            }

            return user;
        }
    }
}