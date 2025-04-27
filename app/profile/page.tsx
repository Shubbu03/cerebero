"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { format } from "date-fns";
import axios from "axios";

interface UserData {
  email: string;
  created_at: string;
}

export default function Profile() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="flex flex-col items-center pt-16 px-4">
      <div className="mb-6">
        <Avatar className="h-72 w-72 rounded-full">
          <AvatarImage
            src={session.user.image || ""}
            className="h-full w-full object-cover rounded-full"
          />
          <AvatarFallback className="h-72 w-72 flex items-center justify-center bg-gray-200 text-gray-700 text-5xl rounded-full">
            {session.user.name
              ? session.user.name.charAt(0).toUpperCase()
              : "U"}
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
  );
}
