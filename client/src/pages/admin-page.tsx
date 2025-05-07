import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ProductsList from "@/components/admin/ProductsList";
import OrdersList from "@/components/admin/OrdersList";
import UsersList from "@/components/admin/UsersList";
import ReviewsList from "@/components/admin/ReviewsList";
import SettingsPage from "@/components/admin/SettingsPage";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  
  // Parse URL params to get active tab
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1] || "");
    const tab = searchParams.get("tab");
    if (tab && ["dashboard", "products", "orders", "users", "reviews", "settings"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && user && !user.isAdmin) {
      setLocation("/");
      toast({
        title: "Доступ запрещен",
        description: "У вас нет прав администратора",
        variant: "destructive",
      });
    } else if (!isLoading && !user) {
      setLocation("/auth");
      toast({
        title: "Требуется авторизация",
        description: "Пожалуйста, войдите в аккаунт",
        variant: "destructive",
      });
    }
  }, [user, isLoading, setLocation, toast]);

  // Loading state
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  // If not admin, return null (useEffect will redirect)
  if (!user || !user.isAdmin) {
    return null;
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "dashboard" && <AdminDashboard />}
      {activeTab === "products" && <ProductsList />}
      {activeTab === "orders" && <OrdersList />}
      {activeTab === "users" && <UsersList />}
      {activeTab === "reviews" && <ReviewsList />}
      {activeTab === "settings" && <SettingsPage />}
    </AdminLayout>
  );
}

// Missing admin components that need to be implemented elsewhere

function SettingsPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Настройки</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="font-medium text-lg mb-4">Платежные реквизиты</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Реквизиты для оплаты</label>
              <textarea 
                className="w-full p-2 border rounded-md" 
                rows={5} 
                placeholder="Введите реквизиты для оплаты"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">QR-код для оплаты</label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center">
                <p className="text-sm text-gray-500 mb-2">Загрузите QR-код</p>
                <button className="bg-primary text-white px-4 py-2 rounded-md text-sm">Загрузить</button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="font-medium text-lg mb-4">Настройка Telegram-бота</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Токен бота</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded-md" 
                placeholder="Введите токен Telegram-бота"
              />
            </div>
            
            <div className="flex items-center">
              <input type="checkbox" id="enableNotifications" className="mr-2" />
              <label htmlFor="enableNotifications" className="text-sm">Включить уведомления</label>
            </div>
            
            <button className="bg-primary text-white px-4 py-2 rounded-md text-sm">Сохранить настройки</button>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="font-medium text-lg mb-4">Настройки интерфейса</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Основной цвет</label>
              <div className="flex gap-2">
                <input type="color" value="#2E7D32" className="w-10 h-10 p-0 border rounded" />
                <input type="text" value="#2E7D32" className="p-2 border rounded-md" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Акцентный цвет</label>
              <div className="flex gap-2">
                <input type="color" value="#FFC107" className="w-10 h-10 p-0 border rounded" />
                <input type="text" value="#FFC107" className="p-2 border rounded-md" />
              </div>
            </div>
            
            <button className="bg-primary text-white px-4 py-2 rounded-md text-sm">Сохранить настройки</button>
          </div>
        </div>
      </div>
    </div>
  );
}
