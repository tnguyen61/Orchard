namespace NGM.CasClient
{
    using System;
    using System.Data.Entity;
    using System.ComponentModel.DataAnnotations.Schema;
    using System.Linq;

    public partial class OrchardEntities : DbContext
    {
        public OrchardEntities()
            : base("name=OrchardEntities")
        {
        }

        public virtual DbSet<Orchard_Users_UserPartRecord> Orchard_Users_UserPartRecord { get; set; }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
        }
    }
}
