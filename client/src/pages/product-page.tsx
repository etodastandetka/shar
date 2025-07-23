import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Product, Review } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, ShoppingCart, Bell, Star, AlertTriangle, ChevronLeft, Truck, Clock, CreditCard, QrCode } from "lucide-react";

// Review form schema
const reviewSchema = z.object({
  rating: z.number().min(1, "Выберите оценку").max(5, "Выберите оценку"),
  text: z.string().min(10, "Минимальная длина отзыва - 10 символов").max(500, "Максимальная длина отзыва - 500 символов"),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;
type InsertReview = ReviewFormValues & { userId: number; productId: number; images: string[] };

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const productId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [notifying, setNotifying] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  
  // Fetch product details
  const { data: product, isLoading: isLoadingProduct, error: productError } = useQuery<Product, Error>({
    queryKey: [`/api/products/${productId}`],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Товар не найден");
        }
        const errorData = await res.json();
        throw new Error(errorData.message || "Ошибка при загрузке товара");
      }
      return res.json();
    },
  });
  
  // Fetch product reviews
  const { data: reviews = [], isLoading: isLoadingReviews, error: reviewsError } = useQuery<Review[], Error>({
    queryKey: [`/api/reviews?productId=${productId}`],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string);
      if (!res.ok) {
         const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch reviews");
      }
      return res.json();
    },
    enabled: !!productId,
  });
  
  // React to product loading/error state
  useEffect(() => {
    if (productError) {
      toast({
        title: "Ошибка при загрузке товара",
        description: productError.message,
        variant: "destructive",
      });
      setLocation("/catalog");
    }
  }, [productError, setLocation, toast]);
  
  // React to reviews loading/error state (optional, depending on desired UX)
  // useEffect(() => {
  //   if (reviewsError) {
  //     toast({
  //       title: "Ошибка при загрузке отзывов",
  //       description: reviewsError.message,
  //       variant: "destructive",
  //     });
  //   }
  // }, [reviewsError, toast]);
  
  // Add to cart
  const addToCart = () => {
    if (!product) return;
    
    // Get current cart from localStorage
    const cartJson = localStorage.getItem("cart") || "[]";
    let cart: any[] = JSON.parse(cartJson);
    
    // Check if product is already in cart
    const existingItemIndex = cart.findIndex((item: any) => item.id === product.id);
    
    if (existingItemIndex >= 0) {
      // Increment quantity
      cart[existingItemIndex].quantity += 1;
    } else {
      // Add new item
      cart.push({
        id: product.id,
        name: product.name,
        image: product.images[0],
        price: product.price,
        quantity: 1
      });
    }
    
    // Save cart
    localStorage.setItem("cart", JSON.stringify(cart));
    
    // Update cart query
    queryClient.setQueryData(["/api/cart"], cart);
    
    // Show toast
    toast({
      title: "Товар добавлен",
      description: `${product.name} добавлен в корзину`,
    });
  };
  
  // Subscribe to notifications
  const subscribeToNotifications = async () => {
    if (!product || !user) {
      toast({
        title: "Требуется авторизация",
        description: "Пожалуйста, войдите в аккаунт, чтобы подписаться на уведомления",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setNotifying(true);
      
      await apiRequest("POST", "/api/notifications", {
        userId: user.id,
        productId: product.id,
        type: "availability"
      });
      
      toast({
        title: "Подписка оформлена",
        description: `Вы получите уведомление, когда ${product.name} появится в наличии`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось подписаться на уведомления",
        variant: "destructive"
      });
    } finally {
      setNotifying(false);
    }
  };
  
  // Review form
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      text: "",
    },
  });
  
  // Submit review mutation
  const reviewMutation = useMutation<Review, Error, InsertReview>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/reviews", data);
       if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Ошибка при отправке отзыва");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reviews?productId=${productId}`] });
      toast({
        title: "Отзыв отправлен",
        description: "Ваш отзыв будет опубликован после проверки модератором",
      });
      setReviewDialogOpen(false);
      form.reset();
      setSelectedRating(0);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleReviewSubmit = (formData: ReviewFormValues) => {
    if (!user || !product) return;
    
    const reviewData: InsertReview = {
      userId: user.id,
      productId: product.id,
      rating: formData.rating,
      text: formData.text,
      images: [],
    };
    
    reviewMutation.mutate(reviewData);
  };
  
  // Format price
  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('ru-RU').format(typeof price === 'string' ? parseFloat(price) : price);
  };
  
  // Calculate discount percentage
  const calculateDiscount = (price: string | number, originalPrice: string | number | null | undefined) => {
    if (!originalPrice) return 0;
    
    const currentPrice = typeof price === 'string' ? parseFloat(price) : price;
    const original = typeof originalPrice === 'string' ? parseFloat(originalPrice) : originalPrice;
    
    return Math.round(((original - currentPrice) / original) * 100);
  };
  
  if (isLoadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (productError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertTriangle className="h-16 w-16 text-error mb-4" />
        <h1 className="text-2xl font-bold mb-2">Ошибка загрузки товара</h1>
        <p className="text-gray-600 mb-6">{productError.message}</p>
        <Button onClick={() => setLocation("/catalog")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Вернуться в каталог
        </Button>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertTriangle className="h-16 w-16 text-error mb-4" />
        <h1 className="text-2xl font-bold mb-2">Товар не найден</h1>
        <p className="text-gray-600 mb-6">Извините, запрашиваемый товар не найден или был удален</p>
        <Button onClick={() => setLocation("/catalog")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Вернуться в каталог
        </Button>
      </div>
    );
  }
  
  const {
    name,
    description,
    images,
    price,
    originalPrice,
    quantity,
    isAvailable,
    category,
    labels = [],
    deliveryCost
  } = product;
  
  const discountPercentage = calculateDiscount(price, originalPrice);
  
  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 w-full max-w-screen-lg">
      <Button 
        variant="ghost" 
        onClick={() => {
          // Проверяем есть ли сохраненный URL для возврата
          const catalogReturnUrl = localStorage.getItem('catalogReturnUrl');
          if (catalogReturnUrl) {
            if (catalogReturnUrl === '/') {
              // Возвращаемся на главную страницу
              setLocation("/");
            } else if (catalogReturnUrl.includes('/catalog')) {
              // Возвращаемся к сохраненному URL каталога
              window.location.href = catalogReturnUrl;
            } else {
              // Fallback к обычному каталогу
              setLocation("/catalog");
            }
          } else {
            // Fallback к обычному каталогу
            setLocation("/catalog");
          }
        }} 
        className="mb-4 sm:mb-6 flex items-center"
      >
        <ChevronLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        {(() => {
          const catalogReturnUrl = localStorage.getItem('catalogReturnUrl');
          return catalogReturnUrl === '/' ? 'Назад на главную' : 'Назад к каталогу';
        })()}
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        {/* Product Images */}
        <div className="md:col-span-1 w-full max-w-md mx-auto relative">
          {images && images.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((image: string, index: number) => (
                  <CarouselItem key={index}>
                    <Card>
                      <CardContent className="flex aspect-square items-center justify-center p-0">
                        <img
                          src={image}
                          alt={`${name} ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {/* Position arrows absolutely */}
              <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10" />
              <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10" />
            </Carousel>
          ) : (
            <div className="flex aspect-square items-center justify-center p-6 bg-gray-200 rounded-lg">
              <AlertTriangle className="h-12 w-12 text-gray-500" />
              <span className="ml-2 text-gray-600">Нет изображений</span>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="md:col-span-1 space-y-4 sm:space-y-6 w-full max-w-md mx-auto md:max-w-full md:mx-0">
          <div>
            <h1 className="heading font-montserrat font-bold text-2xl md:text-3xl">{name}</h1>
            {labels && Array.isArray(labels) && labels.length > 0 && (
              <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                {labels.includes("Скидка") && originalPrice && (
                  <span className="bg-secondary px-2 py-0.5 rounded-full text-white text-xs font-medium">
                    Скидка {calculateDiscount(price, originalPrice)}%
                  </span>
                )}
                {labels.includes("Без выбора") && (
                  <span className="bg-gray-500 px-2 py-0.5 rounded-full text-white text-xs font-medium">
                    Без выбора
                  </span>
                )}
                {labels.includes("Растение с фото") && (
                  <span className="bg-accent px-2 py-0.5 rounded-full text-white text-xs font-medium">
                    Растение с фото
                  </span>
                )}
                {labels.includes("Нет в наличии") && (
                  <span className="bg-error px-2 py-0.5 rounded-full text-white text-xs font-medium">
                    Нет в наличии
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4 flex-wrap">
            <span className="text-primary font-bold text-2xl sm:text-3xl">{formatPrice(price)} ₽</span>
            {originalPrice && parseFloat(originalPrice.toString()) > parseFloat(price.toString()) && (
              <span className="text-gray-500 line-through text-base sm:text-xl">{formatPrice(originalPrice)} ₽</span>
            )}
          </div>

          {isAvailable ? (
            <Button
              className="w-full md:w-auto bg-secondary hover:bg-yellow-500 text-white text-base sm:text-lg py-4 sm:py-6"
              onClick={addToCart}
            >
              <ShoppingCart className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Добавить в корзину
            </Button>
          ) : (
            <Button
              className="w-full md:w-auto bg-primary hover:bg-green-700 text-white text-base sm:text-lg py-4 sm:py-6"
              onClick={subscribeToNotifications}
              disabled={notifying}
            >
              {notifying ? "Подписка..." : (
                <>
                  <Bell className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                  Уведомить о наличии
                </>
              )}
            </Button>
          )}

          {/* Tabs for Description, Care, Delivery, Payment, and Reviews */}
          <Tabs defaultValue="description" className="mt-6 sm:mt-8 w-full overflow-x-hidden">
            {/* Ensure this div handles horizontal scrolling */}
            <div className="flex overflow-x-auto pb-2 scrollbar-hide w-full px-0 sm:px-0">
              <TabsList className="flex space-x-2 sm:space-x-3 mb-4 md:mb-6 lg:mb-8 flex-nowrap min-w-0 justify-start">
                <TabsTrigger value="description" className="flex-shrink-0 text-sm sm:text-base">Описание</TabsTrigger>
                <TabsTrigger value="care" className="flex-shrink-0 text-sm sm:text-base">Уход</TabsTrigger>
                <TabsTrigger value="delivery" className="flex-shrink-0 text-sm sm:text-base">Доставка</TabsTrigger>
                <TabsTrigger value="payment" className="flex-shrink-0 text-sm sm:text-base">Оплата</TabsTrigger>
                <TabsTrigger value="reviews" className="flex-shrink-0 text-sm sm:text-base">Отзывы ({reviews.length})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="description">
              <div className="prose max-w-none">
                <h3 className="heading font-montserrat font-semibold text-xl mb-4">Описание</h3>
                <p>{description}</p>
              </div>
            </TabsContent>

            <TabsContent value="care">
              <div className="prose max-w-none">
                <h3 className="heading font-montserrat font-semibold text-xl mb-4">Уход за растением</h3>

                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Освещение:</h4>
                  <p>
                    Большинство комнатных растений предпочитают яркий рассеянный свет. Разместите растение возле окна, защищая от прямых солнечных лучей, которые могут вызвать ожоги листьев.
                  </p>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Полив:</h4>
                  <p>
                    Частота полива зависит от вида растения, сезона и условий содержания. Общее правило - поливать, когда верхний слой почвы подсох на 2-3 см. Избегайте застоя воды в поддоне.
                  </p>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Влажность:</h4>
                  <p>
                    Тропические растения предпочитают повышенную влажность воздуха. 
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Пересадка и удобрение:</h4>
                  <p>
                    Пересаживайте растения весной каждые 1-2 года. Используйте подходящий грунт и горшок с дренажными отверстиями. Подкармливайте растения в период активного роста (весна-лето) специальными удобрениями.
                  </p>
                 
                  
                  {/* Блок с ссылкой на Telegram канал */}
                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-2 text-green-800 flex items-center">
                      💬 Больше советов по уходу в нашем Telegram канале!
                    </h4>
                    <p className="text-sm text-green-700 mb-2">
                      Присоединяйтесь к нашему каналу <a href="https://t.me/helensjungle" target="_blank" rel="noreferrer" className="text-primary underline font-medium">@helensjungle</a> — там вы найдете множество полезных статей об уходе за растениями в закрепленных постах.
                    </p>
                    <div className="text-xs text-green-600 space-y-1">
                      <p>🔹 Подробные гайды по уходу</p>
                      <p>🔹 Советы по пересадке</p>
                      <p>🔹 Борьба с вредителями</p>
                      <p>🔹 Сезонный уход</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="delivery">
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-3">Информация о доставке</h3>

                  <div className="space-y-4">
                    <div>
                      <p className="font-medium">Стоимость доставки:</p>
                      <p>Стоимость доставки рассчитывается отдельно, в зависимости от размера посылки.</p>
                    </div>

                    <div>
                      <p className="font-medium">Способы доставки:</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        <li className="flex items-start">
                          <Truck className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <span>CDEK – доставка в большинство городов России</span>
                        </li>
                        <li className="flex items-start">
                          <Truck className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <span>Почта России – доставка в отдаленные регионы</span>
                        </li>
                        <li className="flex items-start">
                          <Truck className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <span>Самовывоз – г. Кореновск, ул. Железнодорожная, д. 5</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-medium">Сроки доставки:</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <span>Самовывоз: сразу после оплаты</span>
                        </li>
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <span>Москва и Санкт-Петербург: 3-5 дней</span>
                        </li>
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <span>Другие города: 3-7 дней</span>
                        </li>
                        <li className="flex items-start">
                          <Clock className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <span>Отдаленные регионы: 7-14 дней</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-3">Способы оплаты</h3>

                  <div className="space-y-4">
                    <div>
                      <p className="font-medium">Онлайн-оплата:</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        <li className="flex items-start">
                          <CreditCard className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <span>Оплата банковской картой через Ozon Pay — заказ создается после успешной оплаты</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-medium">Прямой перевод:</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        <li className="flex items-start">
                          <QrCode className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <span>Перевод по QR-коду или по реквизитам карты</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment">
              <div className="prose max-w-none">
                <h3 className="heading font-montserrat font-semibold text-xl mb-4">Оплата</h3>

                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Онлайн-оплата:</h4>
                  <p>
                    Оплата банковской картой через Ozon Pay — заказ создается после успешной оплаты
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Прямой перевод:</h4>
                  <p>
                    Перевод по QR-коду или по реквизитам карты
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-6">
                <h3 className="heading font-montserrat font-semibold text-xl mb-4">Отзывы о товаре</h3>

                {reviews.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    Отзывов пока нет. Будьте первым!
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <Card key={review.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={
                                  `h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`
                                }
                              />
                            ))}
                            <span className="ml-3 text-base font-medium text-gray-700">{review.rating} из 5</span>
                          </CardTitle>
                          <CardDescription>{new Date(review.createdAt || '').toLocaleDateString()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p>{review.text}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {user ? (
                  <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mt-6">
                        Оставить отзыв
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Оставить отзыв о товаре</DialogTitle>
                        <DialogDescription>
                          Поделитесь своим мнением о товаре.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleReviewSubmit)} className="space-y-4">
                          <div>
                            <FormLabel>Ваша оценка</FormLabel>
                            <div className="flex items-center space-x-1 mt-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={
                                    `h-8 w-8 cursor-pointer ${i < selectedRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`
                                  }
                                  onClick={() => {
                                    setSelectedRating(i + 1);
                                    form.setValue("rating", i + 1);
                                  }}
                                />
                              ))}
                            </div>
                            {form.formState.errors.rating && (
                              <p className="text-sm font-medium text-destructive mt-2">
                                {form.formState.errors.rating.message}
                              </p>
                            )}
                          </div>
                          <FormField
                            control={form.control}
                            name="text"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ваш отзыв</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Напишите ваш отзыв здесь..." {...field} rows={4} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button type="submit" disabled={reviewMutation.isPending}>
                              {reviewMutation.isPending ? "Отправка..." : "Отправить отзыв"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="mt-6 text-center text-muted-foreground">
                    <p className="mb-2">Чтобы оставить отзыв, пожалуйста, авторизуйтесь:</p>
                    <Button onClick={() => setLocation("/auth")}>
                      Войти / Зарегистрироваться
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
