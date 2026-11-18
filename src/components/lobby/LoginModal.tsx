import React from "react";
import { AuthModal } from "../auth/AuthModal";
import type { AuthModalProps } from "../auth/AuthModal";

export type LoginModalProps = AuthModalProps;

export const LoginModal: React.FC<LoginModalProps> = (props) => {
  return <AuthModal initialTab={props.initialTab || "SIGN_IN"} {...props} />;
};
