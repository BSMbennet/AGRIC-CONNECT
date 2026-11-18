"use client";
import { useEffect } from "react";
export function ClearCartOnSuccess(){
 useEffect(()=>{localStorage.removeItem("agricnorthx-cart");},[]);
 return null;
}
