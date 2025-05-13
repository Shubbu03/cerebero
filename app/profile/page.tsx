"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import axios from "axios";
import { ContentCard } from "@/components/ContentCard";
import {
  IconTableImport,
  IconTableExport,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import * as XLSX from "xlsx";
import { UserContent } from "../dashboard/page";
import { useRouter } from "next/navigation";

interface UserData {
  email: string;
  created_at: string;
}

interface ImportNotification {
  type: "success" | "error";
  message: string;
}

export default function Profile() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sharedContent, setSharedContent] = useState([]);
  const [allContent, setAllContent] = useState<UserContent[]>([]);
  const [notification, setNotification] = useState<ImportNotification | null>(
    null
  );
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const username = session?.user?.name?.charAt(0).toUpperCase() ?? "U";

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.id) {
        try {
          const response = await axios.get(`/api/get-user/${session.user.id}`);
          setUserData(response.data.data);
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (session?.user) {
      fetchUserData();
    }
  }, [session]);

  useEffect(() => {
    const fetchRecentlySharedData = async () => {
      try {
        const response = await axios.get("/api/get-content/");

        setAllContent(response.data.data);

        const sharedOnly = response.data.data.filter(
          (item: { is_shared: boolean }) => item.is_shared === true
        );

        const sortedByDate = sharedOnly.sort(
          (
            a: { updated_at: string | number | Date },
            b: { updated_at: string | number | Date }
          ) => {
            return (
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime()
            );
          }
        );

        const topShared = sortedByDate.slice(0, 3);

        setSharedContent(topShared);
      } catch (error) {
        console.error("Error fetching shared data:", error);
      }
    };

    fetchRecentlySharedData();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (fileExt !== "xls" && fileExt !== "xlsx") {
      setNotification({
        type: "error",
        message: "Only Excel files (.xls or .xlsx) are allowed.",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const isValidFormat = validateExcelFormat(jsonData);
          if (!isValidFormat) {
            setNotification({
              type: "error",
              message:
                "Invalid file format. Please make sure the file contains columns: type, title, url, and body.",
            });
            setIsImporting(false);
            return;
          }

          const response = await axios.post("/api/import-content", {
            content: jsonData,
          });

          if (response.data.success) {
            setNotification({
              type: "success",
              message: `Successfully imported ${jsonData.length} items.`,
            });

            router.push("/dashboard");
          } else {
            throw new Error(response.data.message || "Import failed");
          }
        } catch (error) {
          console.error("Error processing file:", error);
          setNotification({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to process the file.",
          });
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };

      reader.onerror = () => {
        setNotification({
          type: "error",
          message: "Failed to read the file.",
        });
        setIsImporting(false);
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Error processing file:", error);
      setNotification({
        type: "error",
        message: "Failed to process the file.",
      });
      setIsImporting(false);
    }
  };

  const validateExcelFormat = (data: unknown[]) => {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.every((item) => {
      if (typeof item !== "object" || item === null) {
        return false;
      }
      const keys = Object.keys(item);
      return (
        keys.includes("type") &&
        keys.includes("title") &&
        (keys.includes("url") || keys.includes("body"))
      );
    });
  };

  const handleExport = () => {
    try {
      const exportData = allContent.map((item: UserContent) => ({
        type: item.type || "",
        title: item.title || "",
        url: item.url || "",
        body: item.body || "",
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      XLSX.utils.book_append_sheet(workbook, worksheet, "Content");

      XLSX.writeFile(workbook, "cerebero_content_export.xlsx");

      console.log("Export completed successfully");
    } catch (error) {
      console.error("Error exporting data:", error);
      setNotification({
        type: "error",
        message: "Failed to export data.",
      });
    }
  };

  if (!session) {
    return (
      <div className="flex justify-center pt-16 text-white">
        Please sign in to view your profile
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center pt-16 text-white">
        Loading profile...
      </div>
    );
  }

  const formattedDate = userData?.created_at
    ? format(new Date(userData.created_at), "MMMM d, yyyy")
    : "Unknown";

  return (
    <div>
      <div className="flex flex-col items-center pt-16 px-4">
        <div className="mb-6">
          <Avatar className="h-42 w-42 rounded-full">
            <AvatarImage
              src={session.user.image || ""}
              className="h-42 w-42 object-cover rounded-full"
            />
            <AvatarFallback className="h-42 w-42 flex items-center justify-center bg-gray-200 text-gray-700 text-5xl rounded-full">
              {username}
            </AvatarFallback>
          </Avatar>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-white">
          {session.user.name || "User"}
        </h1>

        <p className="text-gray-400 text-md">
          {userData?.email || "Email not available"} · Joined {formattedDate}
        </p>
      </div>

      {notification && (
        <div
          className={`fixed top-4 right-4 flex items-center p-4 rounded-lg ${
            notification.type === "success" ? "bg-green-800" : "bg-red-800"
          } text-white shadow-lg z-50 max-w-md`}
        >
          {notification.type === "success" ? (
            <IconCheck size={20} className="mr-2" />
          ) : (
            <IconX size={20} className="mr-2" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex justify-end mt-4 mb-2 mx-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xls,.xlsx"
          className="hidden"
        />
        <div className="flex items-center space-x-2">
          <div className="relative group">
            <button
              onClick={handleImport}
              className="flex items-center bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-xl mr-3 cursor-pointer"
              disabled={isImporting}
            >
              <IconTableImport size={20} className="mr-2" />
              {isImporting ? "Importing..." : "Import"}
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 -top-10 opacity-0 group-hover:opacity-100 transition bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none z-50 whitespace-nowrap">
              Bulk import content at once
            </span>
          </div>
          <div className="relative group">
            <button
              onClick={handleExport}
              className="flex items-center bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-xl cursor-pointer"
            >
              <IconTableExport size={20} className="mr-2" />
              Export
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 -top-10 opacity-0 group-hover:opacity-100 transition bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none z-50 whitespace-nowrap">
              Export all your content
            </span>
          </div>
        </div>
      </div>

      <ContentCard
        content={sharedContent}
        isLoading={false}
        username={username}
        origin={"Profile_Shared"}
      />
    </div>
  );
}
