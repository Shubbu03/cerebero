import {
  IconFile,
  IconBrandX,
  IconBrandYoutube,
  IconLink,
} from "@tabler/icons-react";
import { Icon as TablerIcon } from "@tabler/icons-react";

const getContentTypeIcon = (type: string | undefined): TablerIcon => {
  switch (type?.toLowerCase()) {
    case "document":
      return IconFile;
    case "tweet":
      return IconBrandX;
    case "youtube":
      return IconBrandYoutube;
    case "link":
      return IconLink;
    default:
      return IconFile;
  }
};

const getContentTypeName = (type: string | undefined) => {
  switch (type?.toLowerCase()) {
    case "document":
      return "Document";
    case "tweet":
      return "Tweet";
    case "youtube":
      return "YouTube";
    case "link":
      return "Link";
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : "Content";
  }
};

export { getContentTypeIcon, getContentTypeName };
