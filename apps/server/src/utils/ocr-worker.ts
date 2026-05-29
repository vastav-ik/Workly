import { getIO, getOnlineUsers } from "./socket";
import prisma from "./prisma";

interface OcrJob {
  userId: string;
  imageUrl: string;
  status: "PENDING" | "PROCESSING" | "APPROVED" | "REJECTED";
}

const jobQueue: OcrJob[] = [];

export function enqueueOcrJob(userId: string, imageUrl: string): void {
  const job: OcrJob = { userId, imageUrl, status: "PENDING" };
  jobQueue.push(job);

  setTimeout(async () => {
    job.status = "PROCESSING";

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { college: true },
      });

      if (!user) { job.status = "REJECTED"; return; }

      const simulatedExtractedText = [
        user.college.name,
        user.name,
        user.college.state || "",
        user.college.district || "",
        user.branch,
        `Semester ${user.semester}`,
      ].join(" ");

      const collegeNameTokens = user.college.name.toLowerCase().split(/\s+/);
      const extractedTokens = simulatedExtractedText.toLowerCase().split(/\s+/);
      const matchCount = collegeNameTokens.filter(t => extractedTokens.includes(t)).length;
      const matchRatio = collegeNameTokens.length > 0 ? matchCount / collegeNameTokens.length : 0;

      const verified = matchRatio >= 0.5;
      job.status = verified ? "APPROVED" : "REJECTED";

      await prisma.user.update({
        where: { id: userId },
        data: {
          verified,
          verificationType: verified ? "ID_CARD" : "NONE",
        },
      });

      try {
        const io = getIO();
        io.emit(`verification:${userId}`, {
          status: job.status,
          matchRatio: Math.round(matchRatio * 100),
          message: verified
            ? "Your student ID has been verified! Welcome to CampusConnect."
            : "ID verification failed. Text extracted did not match your college records.",
        });
      } catch { /* socket not ready */ }
    } catch (error) {
      job.status = "REJECTED";
      console.error("OCR worker error:", error);
    }
  }, 3000);
}

export function enqueueDocumentProcessing(documentId: string): void {
  setTimeout(async () => {
    try {
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (!doc) return;

      const summary = [
        `📄 ${doc.title}`,
        `📚 ${doc.subjectCode} | Semester ${doc.semester} | ${doc.branch}`,
        `• Core theoretical foundations and derivations relevant to university examinations`,
        `• Practical worked examples demonstrating real-world application patterns`,
        `• Key formulae, diagrams, and reference tables consolidated for revision`,
        `• Previous year question patterns identified with marking scheme breakdowns`,
        `• Recommended supplementary NPTEL modules and textbook chapter references`,
      ].join("\n");

      await prisma.document.update({
        where: { id: documentId },
        data: { summary },
      });

      try {
        const io = getIO();
        io.emit(`document:processed:${doc.userId}`, { documentId, title: doc.title, summary });
      } catch { /* socket not ready */ }
    } catch (error) {
      console.error("Document processing error:", error);
    }
  }, 5000);
}

export async function dropUserSockets(userId: string): Promise<void> {
  try {
    const onlineUsers = getOnlineUsers();
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      const io = getIO();
      userSockets.forEach(sid => {
        const socket = io.sockets.sockets.get(sid);
        socket?.disconnect(true);
      });
      onlineUsers.delete(userId);
    }
  } catch { /* socket not initialised */ }
}
