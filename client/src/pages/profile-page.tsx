import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Order, Review } from "@shared/schema";
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
  CreditCard,
  Star,
  Bell,
  Edit,
  Loader2,
  ShoppingBag,
  MessageSquare,
  Wallet,
  Calendar,
  Eye
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Profile update schema
const profileSchema = z.object({
  fullName: z.string().min(3, "ФИО должно содержать не менее 3 символов"),
  email: z.string().email("Введите корректный email"),
  phone: z.string().min(10, "Введите корректный номер телефона"),
  address: z.string().min(5, "Введите полный адрес"),
  username: z.string().min(3, "Имя пользователя должно содержать не менее 3 символов"),
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

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  
  // Get tab from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1] || "");
    const tab = searchParams.get("tab");
    if (tab && ["profile", "orders", "reviews", "notifications", "balance", "password"].includes(tab)) {
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
    }
  }, [user, setLocation, toast]);
  
  // Fetch user orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string);
      if (!res.ok) throw new Error("Не удалось загрузить заказы");
      return res.json();
    },
    enabled: !!user && activeTab === "orders",
  });
  
  // Fetch user reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string);
      if (!res.ok) throw new Error("Не удалось загрузить отзывы");
      return res.json();
    },
    enabled: !!user && activeTab === "reviews",
  });
  
  // Fetch user notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string);
      if (!res.ok) throw new Error("Не удалось загрузить уведомления");
      return res.json();
    },
    enabled: !!user && activeTab === "notifications",
  });
  
  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      username: user?.username || "",
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
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      if (!user) throw new Error("Пользователь не авторизован");
      const res = await apiRequest("PUT", `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      setIsEditing(false);
      toast({
        title: "Профиль обновлен",
        description: "Ваши данные успешно обновлены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { oldPassword: string; password: string }) => {
      if (!user) throw new Error("Пользователь не авторизован");
      const res = await apiRequest("PUT", `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Пароль изменен",
        description: "Ваш пароль успешно изменен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };
  
  const onPasswordSubmit = (data: PasswordFormValues) => {
    updatePasswordMutation.mutate({
      oldPassword: data.oldPassword,
      password: data.password,
    });
  };
  
  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditing(false);
  };
  
  // Format date
  const formatDate = (dateStr: Date) => {
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
  const getOrderStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">Статус неизвестен</Badge>;
    
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Ожидает оплаты</Badge>;
      case "pending_verification":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Проверка оплаты</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Оплачен</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">В обработке</Badge>;
      case "shipped":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Отправлен</Badge>;
      case "delivered":
        return <Badge variant="outline" className="bg-primary bg-opacity-10 text-primary border-primary border-opacity-20">Доставлен</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Отменен</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (!user) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Мой профиль</CardTitle>
              <CardDescription>Управление аккаунтом</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <Button
                  variant={activeTab === "profile" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("profile")}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  Личные данные
                </Button>
                <Button
                  variant={activeTab === "orders" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("orders")}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Мои заказы
                </Button>
                <Button
                  variant={activeTab === "reviews" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("reviews")}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Мои отзывы
                </Button>
                <Button
                  variant={activeTab === "notifications" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("notifications")}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Уведомления
                </Button>
                <Button
                  variant={activeTab === "balance" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("balance")}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Баланс
                </Button>
                <Button
                  variant={activeTab === "password" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("password")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Сменить пароль
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* User Info Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Avatar className="mx-auto">
                  <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <h3 className="mt-4 font-medium text-lg">{user?.username || "Пользователь"}</h3>
                <p className="text-sm text-muted-foreground">
                  {user?.email || "Email не указан"}
                </p>
                {user?.balance && (
                  <div className="mt-2 text-sm inline-flex items-center bg-green-50 text-green-700 rounded-full px-3 py-1">
                    <Wallet className="h-3 w-3 mr-1" />
                    Баланс: {formatPrice(user.balance)} ₽
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                      <Button type="button" onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Редактировать
                      </Button>
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
                  ) : orders.length > 0 ? (
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
                          <div className="flex items-center">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Детали
                            </Button>
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
            
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Уведомления</CardTitle>
                  <CardDescription>
                    Управление уведомлениями о наличии товаров
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {notificationsLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                      <p className="mt-2 text-sm text-muted-foreground">Загрузка уведомлений...</p>
                    </div>
                  ) : notifications.length > 0 ? (
                    <div className="space-y-4">
                      {notifications.map((notification: any) => (
                        <div key={notification.id} className="flex items-center justify-between border rounded-lg p-4">
                          <div>
                            <h4 className="font-medium">{notification.product?.name || "Товар"}</h4>
                            <p className="text-sm text-muted-foreground">
                              Уведомление о {notification.type === "availability" ? "поступлении в наличие" : "снижении цены"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Уведомления будут приходить в Telegram
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            Удалить
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Нет активных уведомлений</h3>
                      <p className="text-muted-foreground mb-4">
                        Вы можете подписаться на уведомления о поступлении товаров на странице товара. 
                        Уведомления будут приходить в Telegram.
                      </p>
                      <Button asChild>
                        <Link href="/catalog">Перейти в каталог</Link>
                      </Button>
                    </div>
                  )}
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
                              <Input type="password" placeholder="Введите текущий пароль" {...field} />
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
                              <Input type="password" placeholder="Введите новый пароль" {...field} />
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
                            <FormLabel>Подтвердите пароль</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Подтвердите новый пароль" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" disabled={updatePasswordMutation.isPending}>
                        {updatePasswordMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Изменить пароль
                      </Button>
                    </form>
                  </Form>
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
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Текущий баланс</h3>
                        <p className="text-2xl font-semibold">{formatPrice(user?.balance || "0")} ₽</p>
                      </div>
                      <div>
                        <Wallet className="h-10 w-10 text-primary" />
                      </div>
                    </div>
                    
                    <div className="text-center py-12">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">История операций пуста</h3>
                      <p className="text-muted-foreground mb-4">
                        Здесь будут отображаться операции с вашим балансом
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}