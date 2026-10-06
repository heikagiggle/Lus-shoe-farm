import { AnnouncementBar, Navbar } from "@/components/store/header";
import { CartDrawer } from "@/components/store/cart-drawer";
import { QuickAddModal } from "@/components/store/quick-add-modal";
import { ScrollTop } from "@/components/store/scroll-top";
import { Footer } from "@/components/store/footer";
import { ChatWidget } from "@/components/store/chat-widget";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <CartDrawer />
      <QuickAddModal />
      <ScrollTop />
      <ChatWidget />
    </>
  );
}
