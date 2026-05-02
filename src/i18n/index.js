import i18n from "i18next"
import { initReactI18next } from "react-i18next"

const resources = {
  en: {
    translation: {
      dashboard: "Dashboard",
      allAssets: "All Assets",
      addAsset: "Add Asset",
      importAssets: "Import Assets",
      borrowReturn: "Borrow / Return",
      issues: "Issues",
      reports: "Reports",
      history: "History",
      lightMode: "Light Mode",
      darkMode: "Dark Mode",
      signOut: "Sign Out",
      totalAssets: "Total Assets",
      available: "Available",
      assigned: "Assigned",
      openIssues: "Open Issues",
      welcomeMessage: "Welcome to ITAMS — Trainocate Singapore",
      recentAssets: "Recently Added Assets",
      warrantyExpiring: "Warranty Expiring Soon",
      signIn: "Sign in to your account",
      emailAddress: "Email address",
      password: "Password",
      signInButton: "Sign In →",
      signingIn: "Signing in...",
    }
  },
  ms: {
    translation: {
      dashboard: "Papan Pemuka",
      allAssets: "Semua Aset",
      addAsset: "Tambah Aset",
      importAssets: "Import Aset",
      borrowReturn: "Pinjam / Pulang",
      issues: "Isu",
      reports: "Laporan",
      history: "Sejarah",
      lightMode: "Mod Cerah",
      darkMode: "Mod Gelap",
      signOut: "Log Keluar",
      totalAssets: "Jumlah Aset",
      available: "Tersedia",
      assigned: "Ditugaskan",
      openIssues: "Isu Terbuka",
      welcomeMessage: "Selamat datang ke ITAMS — Trainocate Singapura",
      recentAssets: "Aset Baru Ditambah",
      warrantyExpiring: "Waranti Hampir Tamat",
      signIn: "Log masuk ke akaun anda",
      emailAddress: "Alamat emel",
      password: "Kata laluan",
      signInButton: "Log Masuk →",
      signingIn: "Sedang log masuk...",
    }
  },
  zh: {
    translation: {
      dashboard: "仪表板",
      allAssets: "所有资产",
      addAsset: "添加资产",
      importAssets: "导入资产",
      borrowReturn: "借用 / 归还",
      issues: "问题",
      reports: "报告",
      history: "历史记录",
      lightMode: "浅色模式",
      darkMode: "深色模式",
      signOut: "退出登录",
      totalAssets: "总资产",
      available: "可用",
      assigned: "已分配",
      openIssues: "未解决问题",
      welcomeMessage: "欢迎使用 ITAMS — 新加坡 Trainocate",
      recentAssets: "最近添加的资产",
      warrantyExpiring: "保修即将到期",
      signIn: "登录您的账户",
      emailAddress: "电子邮件地址",
      password: "密码",
      signInButton: "登录 →",
      signingIn: "登录中...",
    }
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }
})

export default i18n