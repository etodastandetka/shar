import { Link, useLocation } from "wouter";
import { Home, Search, ShoppingCart, User, Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function MobileNavbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 md:hidden">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto">
        <Link href="/" className="inline-flex flex-col items-center justify-center px-1 group">
          <Home className={`w-6 h-6 mb-1 ${location === "/" ? "text-primary" : "text-gray-500 group-hover:text-primary"}`} />
          <span className={`text-xs ${location === "/" ? "text-primary" : "text-gray-500 group-hover:text-primary"}`}>Главная</span>
        </Link>
        
        <Link href="/catalog" className="inline-flex flex-col items-center justify-center px-1 group">
          <Search className={`w-6 h-6 mb-1 ${location === "/catalog" ? "text-primary" : "text-gray-500 group-hover:text-primary"}`} />
          <span className={`text-xs ${location === "/catalog" ? "text-primary" : "text-gray-500 group-hover:text-primary"}`}>Каталог</span>
        </Link>
        
        <Link href="/cart" className="inline-flex flex-col items-center justify-center px-1 group">
          <ShoppingCart className={`w-6 h-6 mb-1 ${location === "/cart" ? "text-primary" : "text-gray-500 group-hover:text-primary"}`} />
          <span className={`text-xs ${location === "/cart" ? "text-primary" : "text-gray-500 group-hover:text-primary"}`}>Корзина</span>
        </Link>
        
        <Link href={user ? "/profile" : "/auth"} className="inline-flex flex-col items-center justify-center px-1 group">
          <User className={`w-6 h-6 mb-1 ${location === "/profile" || location === "/auth" ? "text-primary" : "text-gray-500 group-hover:text-primary"}`} />
          <span className={`text-xs ${location === "/profile" || location === "/auth" ? "text-primary" : "text-gray-500 group-hover:text-primary"}`}>Профиль</span>
        </Link>
        
        <Link href="/faq" className="inline-flex flex-col items-center justify-center px-1 group">
          <Menu className={`w-6 h-6 mb-1 ${location === "/faq" ? "text-primary" : "text-gray-500 group-hover:text-primary"}`} />
          <span className={`text-xs ${location === "/faq" ? "text-primary" : "text-gray-500 group-hover:text-primary"}`}>Меню</span>
        </Link>
      </div>
    </div>
  );
}

export default MobileNavbar;