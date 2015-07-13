namespace NGM.CasClient
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.ComponentModel.DataAnnotations.Schema;
    using System.Data.Entity.Spatial;

    public partial class aspnet_Roles
    {
        public aspnet_Roles()
        {
            aspnet_Users = new HashSet<aspnet_Users>();
        }

        public Guid ApplicationId { get; set; }

        [Key]
        public Guid RoleId { get; set; }

        [Required]
        [StringLength(256)]
        public string RoleName { get; set; }

        [Required]
        [StringLength(256)]
        public string LoweredRoleName { get; set; }

        [StringLength(256)]
        public string Description { get; set; }

        [StringLength(256)]
        public string RoleShortName { get; set; }

        public int? resource_role { get; set; }

        public virtual ICollection<aspnet_Users> aspnet_Users { get; set; }
    }
}
