namespace NGM.CasClient
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.ComponentModel.DataAnnotations.Schema;
    using System.Data.Entity.Spatial;

    public partial class aspnet_Users
    {
        public aspnet_Users()
        {
            aspnet_Roles = new HashSet<aspnet_Roles>();
        }

        public Guid ApplicationId { get; set; }

        [Key]
        public Guid UserId { get; set; }

        [Required]
        [StringLength(256)]
        public string UserName { get; set; }

        [Required]
        [StringLength(256)]
        public string LoweredUserName { get; set; }

        [StringLength(16)]
        public string MobileAlias { get; set; }

        public bool IsAnonymous { get; set; }

        public DateTime LastActivityDate { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int simpleID { get; set; }

        public virtual ICollection<aspnet_Roles> aspnet_Roles { get; set; }
    }
}
