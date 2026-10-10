"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Home as HomeIcon, Menu, MessageCircle, Search, UserRound } from "lucide-react";

type MobileBottomBarProps = {
  onSearchClick: () => void;
  onMenuClick: () => void;
  currentPage?: "home" | "detail" | "chat" | "page" | "profile";
};

export function MobileBottomBar({ onSearchClick, onMenuClick, currentPage = "page" }: MobileBottomBarProps) {
  return (
    <nav className="mobile-bottom-bar" aria-label="Navigasi mobile">
      <button type="button" onClick={onSearchClick}><Search size={19} /><span>Cari</span></button>
      <Link className={currentPage === "home" ? "is-active" : ""} href={currentPage === "home" ? "#top" : "/"} aria-current={currentPage === "home" ? "page" : undefined}><HomeIcon size={19} /><span>Home</span></Link>
      <Link className={currentPage === "chat" ? "is-active" : ""} href="/chat" aria-current={currentPage === "chat" ? "page" : undefined}><MessageCircle size={19} /><span>Chat</span></Link>
      <SignedIn><Link className={currentPage === "profile" ? "mobile-profile-item is-active" : "mobile-profile-item"} href="/profile" aria-label="Profil"><UserRound size={18} /><span>Profil</span></Link></SignedIn>
      <SignedOut><SignInButton><button type="button" className="mobile-profile-item"><UserRound size={18} /><span>Profil</span></button></SignInButton></SignedOut>
      <button type="button" onClick={onMenuClick}><Menu size={19} /><span>Menu</span></button>
    </nav>
  );
}
