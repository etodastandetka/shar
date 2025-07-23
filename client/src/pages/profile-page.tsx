import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Review } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  User as UserIcon,
  Package,
  Star,
  Bell,
  Edit,
  Loader2,
  ShoppingBag,
  MessageSquare,
  Wallet,
  Calendar,
  Eye,
  Trash2,
  CreditCard
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Local Order type for SQLite database
interface Order {
  id: number;
  userId: number;
  items: any[];
  itemsTotal?: string;
  totalAmount: string;
  deliveryAmount: string;
  promoCode?: string | null;
  promoCodeDiscount?: string | null;
  fullName: string;
  address: string;
  phone: string;
  socialNetwork?: string | null;
  socialUsername?: string | null;
  comment?: string;
  deliveryType: string;
  deliverySpeed: string;
  needStorage?: boolean;
  needInsulation?: boolean;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  paymentProofUrl?: string | null;
  adminComment?: string | null;
  trackingNumber?: string | null;
  estimatedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  lastStatusChangeAt?: string | null;
  statusHistory?: any;
  productQuantitiesReduced?: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

// Profile update schema
const profileSchema = z.object({
  username: z.string().min(3, "Имя пользователя должно содержать не менее 3 символов"),
  email: z.string().email("Введите корректный email"),
  fullName: z.string().min(3, "ФИО должно содержать не менее 3 символов"),
  phone: z.string().min(10, "Введите корректный номер телефона"),
  address: z.string().min(5, "Введите полный адрес"),
});

// Password change schema
const passwordSchema = z.object({
  oldPassword: z.string().min(8, "Минимальная длина пароля - 8 символов"),
  password: z.string().min(8, "Минимальная длина пароля - 8 символов"),
  confirmPassword: z.string().min(8, "Минимальная длина пароля - 8 символов"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

// Delete account schema
const deleteAccountSchema = z.object({
  password: z.string().min(1, "Введите пароль для подтверждения"),
  confirmText: z.string().refine((val) => val === "УДАЛИТЬ", {
    message: "Введите 'УДАЛИТЬ' для подтверждения",
  }),
});

// Используем типы из схем валидации
type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;

// Тип для данных обновления профиля
type UpdateProfile = {
  username?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
};

// Обновляем тип для пользователя
type UpdatedUser = User;

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation, refreshUserData, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const queryClient = useQueryClient();

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      email: "",
      phone: "",
      address: "",
      fullName: "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Delete account form  
  const deleteAccountForm = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      password: "",
    },
  });

  // State for delete account dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Reset form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address
      });
    }
  }, [user, profileForm]);
  
  // Get tab from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1] || "");
    const tab = searchParams.get("tab");
    if (tab && ["profile", "orders", "reviews", "balance", "password"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      setLocation("/auth");
      toast({
        title: "Требуется авторизация",
        description: "Пожалуйста, войдите в аккаунт для доступа к профилю",
        variant: "destructive"
      });
    } else {
      // При монтировании компонента обновляем значения формы
      profileForm.reset({
        username: user?.username || "",
        email: user?.email || "",
        phone: user?.phone || "",
        address: user?.address || "",
        fullName: user?.fullName || "",
      });
    }
  }, [user, setLocation, toast, profileForm]);
  
  // Fetch user orders
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery<Order[]>({
    queryKey: ["/api/user/orders"],
    queryFn: async ({ queryKey }) => {
      console.log("🔄 Загрузка заказов пользователя...");
      const res = await apiRequest("GET", queryKey[0] as string);
      if (!res.ok) {
        console.error("❌ Ошибка загрузки заказов:", res.status, res.statusText);
        throw new Error("Не удалось загрузить заказы");
      }
      const data = await res.json();
      console.log("✅ Заказы загружены:", data);
      return data;
    },
    enabled: !!user && activeTab === "orders",
  });
  
  // Fetch user reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/user/reviews"],
    queryFn: async ({ queryKey }) => {
      const res = await apiRequest("GET", queryKey[0] as string);
      if (!res.ok) throw new Error("Не удалось загрузить отзывы");
      return res.json();
    },
    enabled: !!user && activeTab === "reviews",
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
  mutationFn: async (data: UpdateProfile) => {
    if (!user || !user.id) {
      throw new Error("Пользователь не авторизован или ID не определен");
    }

    console.log("Отправка запроса на обновление профиля:", data);
    
    try {
      const url = `/api/users/${user.id}`;
      console.log("URL запроса:", url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при обновлении профиля");
      }
      
      const result = await response.json();
      console.log("Ответ сервера на обновление профиля:", result);
      return result;
    } catch (error) {
      console.error("Ошибка при обновлении профиля:", error);
      throw error;
    }
  },
  onSuccess: (updatedUser) => {
    console.log("Профиль успешно обновлен:", updatedUser);
    
    // 1. Обновляем данные в React Query кеше
    queryClient.setQueryData(['/api/auth/user'], { user: updatedUser });
    
    // 2. Обновляем глобальное состояние пользователя
    setUser(updatedUser);
    
    // 3. Принудительно обновляем данные с сервера
    refreshUserData();
    
    // 4. Закрываем режим редактирования
    setIsEditing(false);
    
    // 5. Показываем уведомление об успехе
    toast({
      title: "Профиль обновлен",
      description: "Ваши данные успешно сохранены",
      variant: "success",
    });
    
    // 6. Инвалидируем связанные запросы
    queryClient.invalidateQueries({
      queryKey: ['user', user?.id],
      exact: true
    });
  },
  onError: (error: Error) => {
    console.error("Ошибка при обновлении профиля:", error);
    toast({
      title: "Ошибка обновления профиля",
      description: error.message,
      variant: "destructive",
    });
  }
});
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      const res = await apiRequest("PUT", `/api/users/${user.id}/password`, {
        oldPassword: data.oldPassword,
        newPassword: data.password,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to change password");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Пароль успешно изменен",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (data: DeleteAccountFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      const res = await apiRequest("DELETE", `/api/users/${user.id}/account`, {
        password: data.password,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete account");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Аккаунт удален",
        description: "Ваш аккаунт был успешно удален",
      });
      setShowDeleteDialog(false);
      // Redirect to home page after successful deletion
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться",
          variant: "destructive"
        });
        return;
      }

      // Подготавливаем данные для отправки
      const updateData = {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address
      };

      // Отправляем запрос на обновление
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при обновлении профиля');
      }

      const updatedUser = await response.json();
      
      // Обновляем данные пользователя в контексте
      setUser(updatedUser);

      // Обновляем данные в React Query
      queryClient.setQueryData(['user'], { user: updatedUser });

      // Обновляем форму
      profileForm.reset({
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        address: updatedUser.address
      });

      setIsEditing(false);
      toast({
        title: "Успех",
        description: "Профиль успешно обновлен",
        variant: "success"
      });
    } catch (error) {
      console.error("Ошибка при обновлении профиля:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Ошибка при обновлении профиля",
        variant: "destructive"
      });
    }
  };
  
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    console.log("Password form submit:", data);
    try {
      await changePasswordMutation.mutateAsync(data);
    } catch (error) {
      console.error("Password change error:", error);
    }
  };

  const onDeleteAccountSubmit = async (data: DeleteAccountFormValues) => {
    try {
      await deleteAccountMutation.mutateAsync(data);
    } catch (error) {
      console.error("Delete account error:", error);
    }
  };
  
  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditing(false);
  };
  
  // Format date
  const formatDate = (dateStr: Date | string | null) => {
    if (!dateStr) return "Дата неизвестна";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  // Format price
  const formatPrice = (price: string | number) => {
    if (!price) return "0";
    return new Intl.NumberFormat('ru-RU').format(typeof price === 'string' ? parseFloat(price) : price);
  };
  
  // Get order status badge
  const getOrderStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Статус неизвестен</Badge>;
    
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Ожидает оплаты</Badge>;
      case "pending_verification":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Проверка оплаты</Badge>;
      case "paid":
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Оплачен</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">В обработке</Badge>;
      case "shipped":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Отправлен</Badge>;
      case "delivered":
        return <Badge variant="outline" className="bg-primary bg-opacity-10 text-primary border-primary border-opacity-20">Доставлен</Badge>;
      case "cancelled":
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Отменен</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // Retry payment mutation
  const retryPaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/retry-payment`, {});
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при создании ссылки на оплату");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Ссылка на оплату создана",
        description: "Переходим к оплате...",
        variant: "success"
      });
      
      // Redirect to payment
      setTimeout(() => {
        window.location.href = data.paymentUrl;
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleRetryPayment = (orderId: string) => {
    retryPaymentMutation.mutate(orderId);
  };


  
  // Add this function to get formatted status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string, className: string }> = {
      "pending": { label: "В ожидании", className: "bg-amber-100 text-amber-800" },
      "pending_payment": { label: "Ожидает оплаты", className: "bg-blue-100 text-blue-800" },
      "paid": { label: "Оплачен", className: "bg-green-100 text-green-800" },
      "completed": { label: "Оплачен", className: "bg-green-100 text-green-800" },
      "processing": { label: "В обработке", className: "bg-indigo-100 text-indigo-800" },
      "shipped": { label: "Отправлен", className: "bg-purple-100 text-purple-800" },
      "delivered": { label: "Доставлен", className: "bg-gray-100 text-gray-800" },
      "cancelled": { label: "Отменен", className: "bg-red-100 text-red-800" },
      "failed": { label: "Отклонен", className: "bg-red-100 text-red-800" },
    };
    
    const statusInfo = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  
  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Ваш профиль</h1>

      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Просмотр и редактирование данных вашего профиля</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex space-x-4 border-b overflow-x-auto whitespace-nowrap">
              <TabsTrigger value="profile">Профиль</TabsTrigger>
              <TabsTrigger value="orders">Заказы</TabsTrigger>
              <TabsTrigger value="reviews">Отзывы</TabsTrigger>
              <TabsTrigger value="balance">Баланс</TabsTrigger>
              <TabsTrigger value="password">Смена пароля</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Личные данные</CardTitle>
                  <CardDescription>
                    Обновите ваши личные данные и контактную информацию
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={profileForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Имя пользователя</FormLabel>
                                <FormControl>
                                  <Input placeholder="Имя пользователя" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input placeholder="Email" type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ФИО</FormLabel>
                                <FormControl>
                                  <Input placeholder="Полное имя" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Телефон</FormLabel>
                                <FormControl>
                                  <Input placeholder="+7 (XXX) XXX-XX-XX" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="md:col-span-2">
                            <FormField
                              control={profileForm.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Адрес</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Адрес доставки" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Button type="submit" disabled={updateProfileMutation.isPending}>
                            {updateProfileMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Сохранить
                          </Button>
                          <Button type="button" variant="outline" onClick={cancelEditMode}>
                            Отмена
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Имя пользователя</label>
                          <p className="mt-1">{user?.username || "Не указано"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <p className="mt-1">{user?.email || "Не указано"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">ФИО</label>
                          <p className="mt-1">{user?.fullName || "Не указано"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Телефон</label>
                          <p className="mt-1">{user?.phone || "Не указано"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Адрес</label>
                          <p className="mt-1">{user?.address || "Не указано"}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 mt-6">
                        <Button 
                          type="button" 
                          onClick={() => setIsEditing(true)}
                          className="flex-1 bg-primary hover:bg-primary/90 text-white transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Редактировать профиль
                        </Button>
                        
                        {/* Delete Account Button */}
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowDeleteDialog(true)}
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить аккаунт
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Мои заказы</CardTitle>
                  <CardDescription>
                    История и статус ваших заказов
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                      <p className="mt-2 text-sm text-muted-foreground">Загрузка заказов...</p>
                    </div>
                  ) : ordersError ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <Trash2 className="h-8 w-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">Ошибка загрузки заказов</h3>
                      <p className="text-muted-foreground mb-4">
                        Произошла ошибка при загрузке заказов. Попробуйте обновить страницу.
                      </p>
                      <Button onClick={() => window.location.reload()}>
                        Обновить страницу
                      </Button>
                    </div>
                  ) : orders && orders.length > 0 ? (
                    <div className="space-y-6">
                      {orders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">Заказ #{order.id}</h3>
                                {getOrderStatusBadge(order.orderStatus)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <Calendar className="inline h-3 w-3 mr-1" />
                                {formatDate(order.createdAt)}
                              </p>
                            </div>
                            <div className="mt-2 md:mt-0">
                              <div className="text-right">
                                <span className="font-medium text-lg">
                                  {formatPrice(order.totalAmount)} ₽
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Детали
                            </Button>
                            {order.paymentMethod === 'ozonpay' && 
                             order.paymentStatus === 'pending' && 
                             order.orderStatus !== 'cancelled' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRetryPayment(String(order.id))}
                                disabled={retryPaymentMutation.isPending}
                              >
                                {retryPaymentMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CreditCard className="h-4 w-4 mr-2" />
                                )}
                                Оплатить
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">У вас пока нет заказов</h3>
                      <p className="text-muted-foreground mb-4">
                        Перейдите в каталог, чтобы выбрать товары
                      </p>
                      <Button asChild>
                        <Link href="/catalog">Перейти в каталог</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle>Мои отзывы</CardTitle>
                  <CardDescription>
                    Ваши отзывы о приобретенных товарах
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reviewsLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                      <p className="mt-2 text-sm text-muted-foreground">Загрузка отзывов...</p>
                    </div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <span className="font-medium mr-2">
                                Отзыв на товар
                              </span>
                              {!review.isApproved && (
                                <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">На проверке</Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                          
                          <div className="flex mb-2">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={`h-4 w-4 ${idx < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                          
                          <p className="text-sm mb-2">{review.text}</p>
                          
                          {review.images && review.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {review.images.map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`Фото ${idx + 1}`}
                                  className="w-16 h-16 object-cover rounded"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">У вас пока нет отзывов</h3>
                      <p className="text-muted-foreground mb-4">
                        После покупки вы сможете оставить отзыв о товаре
                      </p>
                      <Button asChild>
                        <Link href="/catalog">Перейти в каталог</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="balance">
              <Card>
                <CardHeader>
                  <CardTitle>Баланс</CardTitle>
                  <CardDescription>
                    Информация о состоянии баланса
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Текущий баланс</h3>
                        <p className="text-3xl font-bold text-gray-900">{formatPrice(user?.balance || "0")} ₽</p>
                      </div>
                      <div className="flex items-center">
                        <Wallet className="h-12 w-12 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="text-center py-12">
                      <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">История операций пуста</h3>
                      <p className="text-muted-foreground">
                        Здесь будут отображаться операции с вашим балансом
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>Изменить пароль</CardTitle>
                  <CardDescription>
                    Обновите пароль для защиты вашего аккаунта
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                      <FormField
                        control={passwordForm.control}
                        name="oldPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Текущий пароль</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} className="w-full" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Новый пароль</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} className="w-full" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Подтверждение нового пароля</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} className="w-full" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        disabled={passwordForm.formState.isSubmitting}
                        className="w-full sm:w-auto"
                      >
                        {passwordForm.formState.isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Сменить пароль
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Детали заказа</DialogTitle>
            <DialogDescription>
              {selectedOrder ? `Заказ #${selectedOrder.id} от ${formatDate(selectedOrder.createdAt)}` : ""}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="details">Основная информация</TabsTrigger>
                <TabsTrigger value="items">Товары</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">Информация о заказе</h3>
                    <p><span className="text-gray-500">Статус:</span> {getStatusBadge(selectedOrder.orderStatus)}</p>
                    <div className="mt-4 pt-4 border-t">
                      <p><span className="text-gray-500">Товары:</span> {formatPrice(selectedOrder.itemsTotal || 0)} ₽</p>
                      <p><span className="text-gray-500">Доставка:</span> {formatPrice(selectedOrder.deliveryAmount || 0)} ₽</p>
                      {selectedOrder.promoCodeDiscount && (
                        <p><span className="text-gray-500">Скидка по промокоду:</span> -{formatPrice(selectedOrder.promoCodeDiscount)} ₽</p>
                      )}
                      <p className="font-semibold text-lg mt-2"><span className="text-gray-500">Итого:</span> {formatPrice(selectedOrder.totalAmount || 0)} ₽</p>
                    </div>

                    {selectedOrder.trackingNumber && (
                      <p><span className="text-gray-500">Трек-номер:</span> {selectedOrder.trackingNumber}</p>
                    )}
                    {selectedOrder.estimatedDeliveryDate && (
                      <p><span className="text-gray-500">Предполагаемая дата доставки:</span> {formatDate(selectedOrder.estimatedDeliveryDate)}</p>
                    )}
                    {selectedOrder.actualDeliveryDate && (
                      <p><span className="text-gray-500">Фактическая дата доставки:</span> {formatDate(selectedOrder.actualDeliveryDate)}</p>
                    )}
                    {selectedOrder.adminComment && (
                      <div>
                        <p className="text-gray-500">Комментарий администратора:</p>
                        <p className="mt-1 p-2 bg-gray-100 rounded-md text-sm">{selectedOrder.adminComment}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Информация о получателе</h3>
                    <p><span className="text-gray-500">Имя:</span> {selectedOrder.fullName}</p>
                    <p><span className="text-gray-500">Телефон:</span> {selectedOrder.phone}</p>
                    <p><span className="text-gray-500">Адрес:</span> {selectedOrder.address}</p>
                    {selectedOrder.socialNetwork && selectedOrder.socialUsername && (
                      <p><span className="text-gray-500">Соц. сеть:</span> {selectedOrder.socialNetwork} ({selectedOrder.socialUsername})</p>
                    )}
                    {selectedOrder.comment && (
                       <div>
                        <p className="text-gray-500">Комментарий к заказу:</p>
                        <p className="mt-1 p-2 bg-gray-100 rounded-md text-sm">{selectedOrder.comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="items" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Товар</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead>Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Безопасная функция извлечения товаров из заказа
                      const extractOrderItems = () => {
                        try {
                          // Если у нас уже есть массив товаров, используем его
                          if (Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0) {
                            return selectedOrder.items;
                          }
                          
                          // Если данные в виде строки JSON, пытаемся распарсить
                          if (typeof selectedOrder.items === 'string' && selectedOrder.items.trim()) {
                            try {
                              const parsedItems = JSON.parse(selectedOrder.items);
                              
                              // Проверяем, что результат - массив
                              if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                                return parsedItems;
                              }
                            } catch (parseError) {
                              console.error("Ошибка при парсинге товаров заказа:", parseError);
                              
                              // Проверяем случай двойного экранирования JSON
                              if (selectedOrder.items.startsWith('"[') && selectedOrder.items.endsWith(']"')) {
                                try {
                                  const unescaped = JSON.parse(selectedOrder.items);
                                  const nestedItems = JSON.parse(unescaped);
                                  
                                  if (Array.isArray(nestedItems) && nestedItems.length > 0) {
                                    return nestedItems;
                                  }
                                } catch (nestedError) {
                                  console.error("Ошибка при парсинге вложенного JSON:", nestedError);
                                }
                              }
                            }
                          }
                          
                          // Если не удалось получить данные, но у нас есть информация о сумме заказа,
                          // создаем фиктивный элемент
                          if (selectedOrder.totalAmount && parseFloat(selectedOrder.totalAmount) > 0) {
                            return [{
                              id: 0,
                              productName: "Не удалось загрузить информацию о товаре",
                              name: "Не удалось загрузить информацию о товаре",
                              price: selectedOrder.totalAmount,
                              quantity: 1
                            }];
                          }
                          
                          // Если не удалось получить данные, возвращаем пустой массив
                          return [];
                        } catch (error) {
                          console.error("Непредвиденная ошибка при извлечении товаров:", error);
                          return [];
                        }
                      };
                      
                      // Получаем товары из заказа
                      const orderItems = extractOrderItems();
                      
                      // Если есть товары, отображаем их
                      if (orderItems.length > 0) {
                        return orderItems.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              {item.productName || item.name || 'Не удалось загрузить информацию о товаре'}
                            </TableCell>
                            <TableCell>{formatPrice(item.price || 0)} ₽</TableCell>
                            <TableCell>{item.quantity || 1}</TableCell>
                            <TableCell>{formatPrice(parseFloat(String(item.price || 0)) * (item.quantity || 1))} ₽</TableCell>
                          </TableRow>
                        ));
                      }
                      
                      // Если товаров нет, показываем сообщение об ошибке
                      return (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                            Нет данных о товарах
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Закрыть</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              <Trash2 className="inline mr-2 h-5 w-5" />
              Удалить аккаунт
            </DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Будут удалены все ваши данные, включая заказы, отзывы и личную информацию.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...deleteAccountForm}>
            <form onSubmit={deleteAccountForm.handleSubmit(onDeleteAccountSubmit)} className="space-y-4">
              <FormField
                control={deleteAccountForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль для подтверждения</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Введите ваш пароль" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={deleteAccountForm.control}
                name="confirmText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Подтверждение</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Введите 'УДАЛИТЬ' для подтверждения" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={deleteAccountMutation.isPending}
                >
                  {deleteAccountMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Удалить аккаунт навсегда
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}