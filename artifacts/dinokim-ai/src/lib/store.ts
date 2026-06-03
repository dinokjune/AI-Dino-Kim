import { categories } from "@/data/categories";
import { posts } from "@/data/posts";
import { columns } from "@/data/columns";

// Storage keys
const POSTS_KEY = "dinokim_posts";
const COLUMNS_KEY = "dinokim_columns";
const SETTINGS_KEY = "dinokim_settings";

// Helper to initialize or get data
export function getLocalPosts() {
  const stored = localStorage.getItem(POSTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }
  return posts;
}

export function saveLocalPosts(newPosts: any[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(newPosts));
}

export function getLocalColumns() {
  const stored = localStorage.getItem(COLUMNS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }
  return columns;
}

export function saveLocalColumns(newColumns: any[]) {
  localStorage.setItem(COLUMNS_KEY, JSON.stringify(newColumns));
}

export function isAdminSession() {
  return localStorage.getItem("admin_session") === "true";
}

export function setAdminSession(status: boolean) {
  if (status) {
    localStorage.setItem("admin_session", "true");
  } else {
    localStorage.removeItem("admin_session");
  }
}
