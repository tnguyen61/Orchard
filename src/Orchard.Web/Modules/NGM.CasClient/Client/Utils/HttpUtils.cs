using System.Net;
using Everest;
using Everest.Content;
using System.IO;
using System.Text;

namespace NGM.CasClient.Client.Utils {

    internal static class HttpUtil
    {
        internal static string PerformHttpGet(string url, bool requireHttp200)
        {
            string str = (string)null;
            HttpWebRequest httpWebRequest = (HttpWebRequest)WebRequest.Create(url);
            httpWebRequest.Headers.Add("Cookie", "SeenSniWarning=1");
            using (HttpWebResponse httpWebResponse = (HttpWebResponse)httpWebRequest.GetResponse())
            {
                if (!requireHttp200 || httpWebResponse.StatusCode == HttpStatusCode.OK)
                {
                    using (Stream responseStream = httpWebResponse.GetResponseStream())
                    {
                        if (responseStream != null)
                        {
                            using (StreamReader streamReader = new StreamReader(responseStream))
                                str = streamReader.ReadToEnd();
                        }
                    }
                }
            }
            return str;
        }

        internal static string PerformFederatedHttpGet(string url, string FederatedKey)
        {
            string str = (string)null;
            HttpWebRequest httpWebRequest = (HttpWebRequest)WebRequest.Create(url);
            httpWebRequest.Headers.Add("FederatedKey", FederatedKey);
            using (HttpWebResponse httpWebResponse = (HttpWebResponse)httpWebRequest.GetResponse())
            {
                if (httpWebResponse.StatusCode == HttpStatusCode.OK)
                {
                    using (Stream responseStream = httpWebResponse.GetResponseStream())
                    {
                        if (responseStream != null)
                        {
                            using (StreamReader streamReader = new StreamReader(responseStream))
                                str = streamReader.ReadToEnd();
                        }
                    }
                }
            }
            return str;
        }

        internal static string PerformHttpPost(string url, string postData, bool requireHttp200)
        {
            HttpStatusCode statusCode;
            WebHeaderCollection headers;
            return HttpUtil.PerformHttpPost(url, postData, requireHttp200, out statusCode, out headers);
        }

        internal static string PerformHttpPost(string url, string postData, bool requireHttp200, out HttpStatusCode statusCode, out WebHeaderCollection headers)
        {
            string str = (string)null;
            HttpWebRequest httpWebRequest = (HttpWebRequest)WebRequest.Create(url);
            httpWebRequest.Method = "POST";
            httpWebRequest.Headers.Add("Cookie", "SeenSniWarning=1");
            httpWebRequest.ContentType = "application/x-www-form-urlencoded";
            httpWebRequest.ContentLength = (long)Encoding.UTF8.GetByteCount(postData);
            using (StreamWriter streamWriter = new StreamWriter(httpWebRequest.GetRequestStream()))
                streamWriter.Write(postData);
            using (HttpWebResponse httpWebResponse = (HttpWebResponse)httpWebRequest.GetResponse())
            {
                headers = httpWebResponse.Headers;
                statusCode = httpWebResponse.StatusCode;
                using (Stream responseStream = httpWebResponse.GetResponseStream())
                {
                    if (responseStream != null)
                    {
                        using (StreamReader streamReader = new StreamReader(responseStream))
                            str = streamReader.ReadToEnd();
                    }
                }
            }
            return str;
        }
    }

}