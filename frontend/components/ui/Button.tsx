import React from "react";
export function Button({ children, variant = "primary", className = "", ...rest }: any) {
  const v = variant === "primary" ? "btn-primary" : variant === "ghost" ? "btn-ghost" : variant === "danger" ? "btn-danger" : "btn-primary";
  return <button className={`btn ${v} ${className}`} {...rest}>{children}</button>;
}
