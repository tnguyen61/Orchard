using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Web;
using System.Xml.Serialization;

namespace NGM.CasClient.Client.Security
{
    [XmlType(Namespace = "https://max.gov")]
    [DesignerCategory("code")]
    [Serializable]
    public class maxAttributes
    {

        [JsonIgnore]
        public string[] Groups
        {
            get
            {
                List<string> list1 = Enumerable.ToList<string>((IEnumerable<string>)this.GroupList.Split(new string[1]
        {
          ","
        }, StringSplitOptions.RemoveEmptyEntries));
                if (!string.IsNullOrEmpty(this.MAXAuthenticationGroups))
                {
                    List<string> list2 = Enumerable.ToList<string>((IEnumerable<string>)this.MAXAuthenticationGroups.Split(new string[1]
          {
            ","
          }, StringSplitOptions.RemoveEmptyEntries));
                    list1 = Enumerable.ToList<string>(Enumerable.Concat<string>((IEnumerable<string>)list1, (IEnumerable<string>)list2));
                }
                return list1.ToArray();
            }
        }

        [XmlElement("samlAuthenticationStatementAuthMethod")]
        public string samlAuthenticationStatementAuthMethod { get; set; }

        [XmlElement("User-Classification")]
        public string UserClassification { get; set; }

        [XmlElement("Bureau-Name")]
        public string BureauName { get; set; }

        [XmlElement("MAXAuthenticationGroups")]
        public string MAXAuthenticationGroups { get; set; }

        [XmlElement("Phone")]
        public string Phone { get; set; }

        [XmlElement("User-Status")]
        public string UserStatus { get; set; }

        [XmlElement("Auth-Method-At-Partner-Idp")]
        public string AuthMethodAtPartnerIdp { get; set; }

        [XmlElement("Bureau-Code")]
        public string BureauCode { get; set; }

        [XmlElement("Partner-Entity-Id")]
        public string PartnerEntityId { get; set; }

        [XmlElement("EAuthLOA")]
        public string EAuthLOA { get; set; }

        [XmlElement("Middle-Name")]
        public string MiddleName { get; set; }

        [XmlElement("Org-Tag")]
        public string OrgTag { get; set; }

        [XmlElement("MAX-ID")]
        public string MAXID { get; set; }

        [XmlElement("GroupList")]
        public string GroupList { get; set; }

        [XmlElement("Email-Address")]
        public string EmailAddress { get; set; }

        [XmlElement("Agency-Code")]
        public string AgencyCode { get; set; }

        [XmlElement("Agency-Name")]
        public string AgencyName { get; set; }

        [XmlElement("Last-Name")]
        public string LastName { get; set; }

        [XmlElement("First-Name")]
        public string FirstName { get; set; }
    }
}