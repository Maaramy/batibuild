import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { LoadingState } from "@/components/ui/States";

export default function Index() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? "/(tabs)" : "/(auth)/sign-in");
  }, [isAuthenticated, isLoading, router]);

  return <LoadingState label="BudgetBati" />;
}