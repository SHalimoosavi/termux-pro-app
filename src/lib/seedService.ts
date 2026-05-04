import { db } from './firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const INITIAL_MODULES = [
  {
    name: "Python Dev Suite",
    description: "Full Python 3 environment with pip, virtualenv, and essential libraries for data science.",
    category: "development",
    authorId: "system",
    authorName: "TermuxPro",
    downloadUrl: "https://github.com/termux/termux-packages/archive/refs/heads/master.zip",
    downloadCount: 1540,
  },
  {
    name: "Web Pen-Test Kit",
    description: "Nmap, Nikto, and SQLmap pre-configured for mobile security audits.",
    category: "cybersecurity",
    authorId: "system",
    authorName: "TermuxPro",
    downloadUrl: "https://github.com/sqlmapproject/sqlmap/archive/refs/heads/master.zip",
    downloadCount: 890,
  },
  {
    name: "Automated Telegram Bot",
    description: "Skeleton for a Python-based Telegram bot with cron-job integration for daily reports.",
    category: "automation",
    authorId: "system",
    authorName: "TermuxPro",
    downloadUrl: "https://github.com/python-telegram-bot/python-telegram-bot/archive/refs/heads/master.zip",
    downloadCount: 420,
  },
  {
    name: "React Mobile Framework",
    description: "Lightweight React setup optimized for high-performance mobile PWA development inside Termux.",
    category: "web",
    authorId: "system",
    authorName: "TermuxPro",
    downloadUrl: "https://github.com/facebook/react/archive/refs/heads/main.zip",
    downloadCount: 1210,
  },
  {
    name: "TensorFlow Lite Mobile",
    description: "Pre-compiled TensorFlow Lite binaries for on-device machine learning and object detection.",
    category: "ai",
    authorId: "system",
    authorName: "TermuxPro",
    downloadUrl: "https://github.com/tensorflow/tensorflow/archive/refs/heads/master.zip",
    downloadCount: 2100,
  }
];

export async function seedInitialModules() {
  const modulesRef = collection(db, 'modules');
  const snapshot = await getDocs(modulesRef);
  
  if (snapshot.empty) {
    console.log("Seeding initial modules...");
    for (const module of INITIAL_MODULES) {
      await addDoc(modulesRef, {
        ...module,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
}
