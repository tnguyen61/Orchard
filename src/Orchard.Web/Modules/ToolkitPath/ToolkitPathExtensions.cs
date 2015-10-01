using System.Configuration;
using System.Web.Mvc;

namespace ToolkitPath
{
    public static class ToolkitPathExtensions
    {
        public static string ToolkitPath(this HtmlHelper htmlHelper, string path)
        {
            return ConfigurationManager.AppSettings["ToolkitBrowseUrl"] + path;
        }
    }
}