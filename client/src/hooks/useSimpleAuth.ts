import { useContext } from "react";
import { AuthContext } from "@/context/SimpleAuthContext";

export function useSimpleAuth() {
  return useContext(AuthContext);
}