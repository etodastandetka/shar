import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  User as UserIcon,
  Package,
  CreditCard,
  Star,
  Edit,
  Save,
  Eye,
  MoreHorizontal,
  Shield,
  Loader2,
  Bell,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

// Profile update schema
const profileSchema = z.object({
  fullName: z.string().min(3, "ФИО должно содержать не менее 3 символов"),
  email: z.string().email("Введите корректный email"),
  phone: z.string().min(10, "Введите корректный номер телефона"),
  address: z.string().min(5, "Введите полный адрес"),
});

// Password change schema
const passwordSchema = z.object({
  oldPassword: z.string().min(8, "Минимальная длина пароля - 8 символов"),
  newPassword: z.string().min(8, "Минимальная длина пароля - 8 символов"),
  confirmPassword: z.string().min(8, "Минимальная длина пароля - 8 символов"),
}).refine((data) => data.newPassword === data.confirmPassword, {
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
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Get tab from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1] || "");
    const tab = searchParams.get("tab");
    if (tab && ["profile", "orders", "reviews", "notifications", "balance"].includes(tab)) {
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
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Order edit form
  const orderEditForm = useForm({
    defaultValues: {
      fullName: "",
      phone: "",
      address: "",
      needStorage: false,
      needInsulation: false,
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

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/orders/${orderId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setEditingOrder(null);
      toast({
        title: "Заказ обновлен",
        description: "Данные заказа успешно обновлены",
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

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest("DELETE", `/api/notifications/${notificationId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Уведомление удалено",
        description: "Уведомление успешно удалено",
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

  // Handle profile submission
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Handle password submission
  const onPasswordSubmit = (data: PasswordFormValues) => {
    updatePasswordMutation.mutate({
      oldPassword: data.oldPassword,
      password: data.newPassword,
    });
  };

  // Handle order edit submission
  const onOrderEditSubmit = (data: any) => {
    if (!editingOrder) return;
    
    updateOrderMutation.mutate({
      orderId: editingOrder.id,
      data,
    });
  };

  // Set up editing order form
  useEffect(() => {
    if (editingOrder) {
      orderEditForm.reset({
        fullName: editingOrder.fullName,
        phone: editingOrder.phone,
        address: editingOrder.address,
        needStorage: editingOrder.needStorage,
        needInsulation: editingOrder.needInsulation,
      });
    }
  }, [editingOrder, orderEditForm]);

  // Enable edit mode
  const enableEditMode = () => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        address: user.address,
      });
      setIsEditing(true);
    }
  };

  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditing(false);
  };

  // Format date
  const formatDate = (dateStr: Date) => {
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
    return new Intl.NumberFormat('ru-RU').format(typeof price === 'string' ? parseFloat(price) : price);
  };

  // Get order status badge
  const getOrderStatusBadge = (status: string) => {
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

  // Can edit order
  const canEditOrder = (order: Order) => {
    return order.orderStatus !== "shipped" && order.orderStatus !== "delivered" && order.orderStatus !== "cancelled";
  };

  // Check if user can log out
  const showLogoutButton = () => !!user;

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Личный кабинет</CardTitle>
              <CardDescription>
                {user.isAdmin ? "Администратор" : "Пользователь"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
                <TabsList className="flex flex-col items-stretch h-auto p-0 bg-transparent border-r-0">
                  <TabsTrigger
                    value="profile"
                    className="justify-start px-4 py-3 data-[state=active]:bg-muted rounded-none border-b"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    Профиль
                  </TabsTrigger>
                  <TabsTrigger
                    value="orders"
                    className="justify-start px-4 py-3 data-[state=active]:bg-muted rounded-none border-b"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Мои заказы
                  </TabsTrigger>
                  <TabsTrigger
                    value="reviews"
                    className="justify-start px-4 py-3 data-[state=active]:bg-muted rounded-none border-b"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Отзывы
                  </TabsTrigger>
                  <TabsTrigger
                    value="notifications"
                    className="justify-start px-4 py-3 data-[state=active]:bg-muted rounded-none border-b"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Уведомления
                  </TabsTrigger>
                  <TabsTrigger
                    value="balance"
                    className="justify-start px-4 py-3 data-[state=active]:bg-muted rounded-none"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Баланс
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
            {showLogoutButton() && (
              <CardFooter className="px-4 py-3 flex justify-between border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Выход...
                    </>
                  ) : (
                    "Выйти"
                  )}
                </Button>
                
                {user.isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation("/admin")}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Админ
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <TabsContent value="profile" className="mt-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Профиль</CardTitle>
                  <CardDescription>
                    Управление личными данными
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" onClick={enableEditMode}>
                    <Edit className="mr-2 h-4 w-4" />
                    Редактировать
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={cancelEditMode}>
                    Отмена
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ФИО</FormLabel>
                            <FormControl>
                              <Input {...field} className="form-input" />
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
                              <Input {...field} className="form-input" />
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
                              <Input {...field} className="form-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Адрес</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="form-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="bg-primary text-white">
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Сохранить
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">ФИО</h3>
                          <p>{user.fullName}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                          <p>{user.email}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Телефон</h3>
                          <p>{user.phone}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-1">Имя пользователя</h3>
                          <p>{user.username}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Адрес</h3>
                        <p>{user.address}</p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div>
                      <h3 className="font-medium mb-4">Изменить пароль</h3>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                          <FormField
                            control={passwordForm.control}
                            name="oldPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Текущий пароль</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} className="form-input" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={passwordForm.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Новый пароль</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} className="form-input" />
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
                                  <FormLabel>Подтверждение пароля</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} className="form-input" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button type="submit" variant="outline">
                            {updatePasswordMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Сохранение...
                              </>
                            ) : (
                              "Изменить пароль"
                            )}
                          </Button>
                        </form>
                      </Form>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Мои заказы</CardTitle>
                <CardDescription>
                  История ваших заказов и их статусы
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ))}
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-6">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted p-4 flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Заказ #{order.id} от {formatDate(order.createdAt)}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {getOrderStatusBadge(order.orderStatus)}
                              <span className="font-medium">
                                {formatPrice(order.totalAmount)} ₽
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {canEditOrder(order) && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingOrder(order)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Изменить
                              </Button>
                            )}
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Детали
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>Заказ #{order.id}</DialogTitle>
                                  <DialogDescription>
                                    Оформлен {formatDate(order.createdAt)}
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                  <div>
                                    <h3 className="font-medium mb-2">Информация о заказе</h3>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Статус:</span>
                                        <span>{getOrderStatusBadge(order.orderStatus)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Оплата:</span>
                                        <span>{getOrderStatusBadge(order.paymentStatus)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Способ оплаты:</span>
                                        <span>{
                                          order.paymentMethod === "yoomoney" ? "YooMoney" :
                                          order.paymentMethod === "directTransfer" ? "Прямой перевод" :
                                          order.paymentMethod === "balance" ? "Баланс" : order.paymentMethod
                                        }</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Доставка:</span>
                                        <span>{
                                          order.deliveryType === "cdek" ? "CDEK" :
                                          order.deliveryType === "russianPost" ? "Почта России" : order.deliveryType
                                        }</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Скорость доставки:</span>
                                        <span>{
                                          order.deliverySpeed === "standard" ? "Стандартная" :
                                          order.deliverySpeed === "express" ? "Экспресс" : order.deliverySpeed
                                        }</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Передержка:</span>
                                        <span>{order.needStorage ? "Да" : "Нет"}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Утепление:</span>
                                        <span>{order.needInsulation ? "Да" : "Нет"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h3 className="font-medium mb-2">Адрес доставки</h3>
                                    <div className="space-y-1 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">ФИО: </span>
                                        <span>{order.fullName}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Телефон: </span>
                                        <span>{order.phone}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Адрес: </span>
                                        <span>{order.address}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <Separator />
                                
                                <div className="py-4">
                                  <h3 className="font-medium mb-3">Товары</h3>
                                  <ScrollArea className="h-[200px]">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Товар</TableHead>
                                          <TableHead className="text-right">Кол-во</TableHead>
                                          <TableHead className="text-right">Цена</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                                          <TableRow key={index}>
                                            <TableCell>{item.productId}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatPrice(item.price)} ₽</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </ScrollArea>
                                  
                                  <div className="mt-4 space-y-2">
                                    <div className="flex justify-between">
                                      <span>Товары:</span>
                                      <span>{formatPrice(parseFloat(order.totalAmount) - parseFloat(order.deliveryAmount))} ₽</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Доставка:</span>
                                      <span>{formatPrice(order.deliveryAmount)} ₽</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-medium">
                                      <span>Итого:</span>
                                      <span>{formatPrice(order.totalAmount)} ₽</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {order.adminComment && (
                                  <Alert>
                                    <AlertTitle>Комментарий администратора</AlertTitle>
                                    <AlertDescription>
                                      {order.adminComment}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">У вас пока нет заказов</h3>
                    <p className="text-muted-foreground mb-4">Самое время что-то приобрести</p>
                    <Button onClick={() => setLocation("/catalog")}>
                      Перейти в каталог
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Мои отзывы</CardTitle>
                <CardDescription>
                  Отзывы, которые вы оставили о товарах
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex justify-between mb-2">
                          <div className="flex items-center">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? "text-secondary fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground ml-2">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                          <Badge variant={review.isApproved ? "default" : "outline"}>
                            {review.isApproved ? "Опубликован" : "На модерации"}
                          </Badge>
                        </div>
                        <p className="text-sm">{review.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">У вас пока нет отзывов</h3>
                    <p className="text-muted-foreground mb-4">Оставьте отзыв о купленных товарах</p>
                    <Button onClick={() => setLocation("/catalog")}>
                      Перейти в каталог
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Уведомления</CardTitle>
                <CardDescription>
                  Подписки на уведомления о наличии товаров
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notificationsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="border rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            Товар #{notification.productId}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Подписка от {formatDate(notification.createdAt)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                          disabled={deleteNotificationMutation.isPending}
                        >
                          {deleteNotificationMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Отписаться"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">У вас пока нет подписок</h3>
                    <p className="text-muted-foreground mb-4">Подпишитесь на уведомления о наличии интересующих вас товаров</p>
                    <Button onClick={() => setLocation("/catalog")}>
                      Перейти в каталог
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balance" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Баланс</CardTitle>
                <CardDescription>
                  Ваш текущий баланс и история операций
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-6 rounded-lg mb-6 text-center">
                  <h3 className="text-sm text-muted-foreground mb-1">Текущий баланс</h3>
                  <p className="text-3xl font-bold text-primary">
                    {formatPrice(user.balance || 0)} ₽
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">История операций</h3>
                  
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
        </div>
      </div>

      {/* Order Edit Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование заказа #{editingOrder?.id}</DialogTitle>
            <DialogDescription>
              Вы можете отредактировать данные заказа
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={orderEditForm.handleSubmit(onOrderEditSubmit)}>
            <div className="grid grid-cols-1 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="fullName">
                  ФИО получателя
                </label>
                <Input
                  id="fullName"
                  {...orderEditForm.register("fullName")}
                  className="form-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="phone">
                  Телефон
                </label>
                <Input
                  id="phone"
                  {...orderEditForm.register("phone")}
                  className="form-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="address">
                  Адрес доставки
                </label>
                <Textarea
                  id="address"
                  {...orderEditForm.register("address")}
                  className="form-input"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="needStorage"
                  {...orderEditForm.register("needStorage")}
                  className="form-checkbox h-4 w-4"
                />
                <label htmlFor="needStorage" className="text-sm">
                  Нужна передержка
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="needInsulation"
                  {...orderEditForm.register("needInsulation")}
                  className="form-checkbox h-4 w-4"
                />
                <label htmlFor="needInsulation" className="text-sm">
                  Нужно утепление
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingOrder(null)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={updateOrderMutation.isPending}
              >
                {updateOrderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
