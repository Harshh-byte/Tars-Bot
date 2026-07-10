import { useEffect } from "react";

export default function SEO({ title, description }) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | Tars Bot` : "Tars Bot | The Savage Discord Companion";

    let metaDesc = document.querySelector('meta[name="description"]');
    let created = false;
    let prevDesc = "";
    
    if (metaDesc) {
      prevDesc = metaDesc.getAttribute("content") || "";
      metaDesc.setAttribute("content", description || "The ultimate sarcastic Discord companion.");
    } else {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      metaDesc.setAttribute("content", description || "The ultimate sarcastic Discord companion.");
      document.head.appendChild(metaDesc);
      created = true;
    }

    return () => {
      document.title = prevTitle;
      if (created && metaDesc) {
        document.head.removeChild(metaDesc);
      } else if (metaDesc) {
        metaDesc.setAttribute("content", prevDesc);
      }
    };
  }, [title, description]);

  return null;
}
