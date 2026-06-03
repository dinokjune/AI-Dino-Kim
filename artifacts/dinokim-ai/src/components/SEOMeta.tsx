import { Helmet } from "react-helmet-async";
import { siteConfig } from "@/data/siteConfig";

interface SEOMetaProps {
  title?: string;
  description?: string;
  canonical?: string;
  type?: "website" | "article";
}

export function SEOMeta({
  title,
  description,
  canonical,
  type = "website",
}: SEOMetaProps) {
  const pageTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const pageDesc = description || siteConfig.description;
  const url = canonical ? `https://${siteConfig.domain}${canonical}` : `https://${siteConfig.domain}`;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDesc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteConfig.name} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDesc} />
    </Helmet>
  );
}
