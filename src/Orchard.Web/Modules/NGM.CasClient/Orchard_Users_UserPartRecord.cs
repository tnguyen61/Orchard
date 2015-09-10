namespace NGM.CasClient
{
    using System;
    using System.Collections.Generic;
    using System.ComponentModel.DataAnnotations;
    using System.ComponentModel.DataAnnotations.Schema;
    using System.Data.Entity.Spatial;

    public partial class Orchard_Users_UserPartRecord
    {
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int Id { get; set; }

        [StringLength(255)]
        public string UserName { get; set; }

        [StringLength(255)]
        public string Email { get; set; }

        [StringLength(255)]
        public string NormalizedUserName { get; set; }

        [StringLength(255)]
        public string Password { get; set; }

        [StringLength(255)]
        public string PasswordFormat { get; set; }

        [StringLength(255)]
        public string HashAlgorithm { get; set; }

        [StringLength(255)]
        public string PasswordSalt { get; set; }

        [StringLength(255)]
        public string RegistrationStatus { get; set; }

        [StringLength(255)]
        public string EmailStatus { get; set; }

        [StringLength(255)]
        public string EmailChallengeToken { get; set; }
    }
}
