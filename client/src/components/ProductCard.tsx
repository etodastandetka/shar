import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [notifying, setNotifying] = useState(false);
  
  const {
    id,
    name,
    images,
    price,
    originalPrice,
    quantity,
    isAvailable,
    labels = []
  } = product;
  
  const hasDiscount = originalPrice && parseFloat(originalPrice.toString()) > parseFloat(price.toString());
  const discountPercentage = hasDiscount
    ? Math.round(
        ((parseFloat(originalPrice.toString()) - parseFloat(price.toString())) / parseFloat(originalPrice.toString())) * 100
      )
    : 0;
  
  // Показываем плашку уценки если есть скидка ИЛИ установлен флаг isDiscounted
  const showDiscountBadge = hasDiscount || Boolean(product.isDiscounted);
  
  const addToCart = () => {
    // Get current cart from localStorage
    const cartJson = localStorage.getItem("cart") || "[]";
    let cart = JSON.parse(cartJson);
    
    // Check if product is already in cart
    const existingItemIndex = cart.findIndex((item: any) => item.id === id);
    
    if (existingItemIndex >= 0) {
      // Increment quantity
      cart[existingItemIndex].quantity += 1;
    } else {
      // Add new item
      cart.push({
        id,
        name,
        image: images[0],
        price,
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
      description: `${name} добавлен в корзину`,
    });
  };
  
  const subscribeToNotifications = async () => {
    if (!user) {
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
        productId: id,
        type: "availability"
      });
      
      toast({
        title: "Подписка оформлена",
        description: `Вы получите уведомление, когда ${name} появится в наличии`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось подписаться на уведомления",
        variant: "destructive"
      });
    } finally {
      setNotifying(false);
    }
  };
  
  return (
    <div className="card bg-white rounded-lg overflow-hidden shadow-md w-full max-w-[280px] transition-transform hover:scale-[1.02] h-full flex flex-col">
      <div className="relative">
        <Link 
          href={`/product/${id}`}
          onClick={() => {
            // Сохраняем текущий URL для возврата
            if (window.location.pathname.includes('/catalog')) {
              localStorage.setItem('catalogReturnUrl', window.location.href);
            } else if (window.location.pathname === '/') {
              localStorage.setItem('catalogReturnUrl', '/');
            }
          }}
        >
          <img 
            src={images[0]} 
            alt={name} 
            className={`w-full aspect-square object-cover ${!isAvailable ? 'opacity-70' : ''}`}
          />
        </Link>
        
        {/* Флажки товара */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
          {/* Новые плашки */}
          {product.isPreorder && (
            <span className="bg-amber-500 px-2 py-1 rounded-full text-white text-xs font-medium shadow-md">
              📦 Предзаказ
            </span>
          )}
          {showDiscountBadge && (
            <span className="bg-red-500 px-2 py-1 rounded-full text-white text-xs font-medium shadow-md">
              💰 Уценка{hasDiscount ? ` -${discountPercentage}%` : ''}
            </span>
          )}
          
          {/* Существующие плашки */}
          {product.isHotDeal && (
            <span className="bg-red-500 px-2 py-1 rounded-full text-white text-xs font-medium shadow-md">
              🔥 Горячая цена
            </span>
          )}
          {product.isBestseller && (
            <span className="bg-orange-500 px-2 py-1 rounded-full text-white text-xs font-medium shadow-md">
              ⭐ Хит продаж
            </span>
          )}
          {product.isNewArrival && (
            <span className="bg-blue-500 px-2 py-1 rounded-full text-white text-xs font-medium shadow-md">
              ✨ Новинка
            </span>
          )}
          {product.isLimitedEdition && (
            <span className="bg-purple-500 px-2 py-1 rounded-full text-white text-xs font-medium shadow-md">
              💎 Лимитированная
              </span>
            )}
          
          {/* Старые лейблы для совместимости */}
          {labels && Array.isArray(labels) && labels.length > 0 && (
            <>
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
            </>
            )}
          </div>
      </div>
      
      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        <Link 
          href={`/product/${id}`}
          onClick={() => {
            // Сохраняем текущий URL для возврата
            if (window.location.pathname.includes('/catalog')) {
              localStorage.setItem('catalogReturnUrl', window.location.href);
            } else if (window.location.pathname === '/') {
              localStorage.setItem('catalogReturnUrl', '/');
            }
          }}
        >
          <h3 className="heading font-montserrat font-semibold text-base sm:text-lg line-clamp-2 mb-2 hover:text-primary transition-colors min-h-[3rem]">{name}</h3>
        </Link>
        
        <div className="flex justify-between items-center mb-3 flex-wrap sm:flex-nowrap flex-grow">
          <div className="w-full sm:w-auto mb-2 sm:mb-0">
            <span className="text-primary font-bold text-base sm:text-lg">
              {new Intl.NumberFormat('ru-RU').format(parseFloat(price.toString()))} ₽
            </span>
            {showDiscountBadge && originalPrice && (
              <span className="text-gray-400 line-through text-sm ml-2">
                {new Intl.NumberFormat('ru-RU').format(parseFloat(originalPrice.toString()))} ₽
              </span>
            )}
          </div>
          <span className={`text-xs sm:text-sm ${isAvailable ? 'text-success' : 'text-error'}`}>
            {isAvailable ? 'В наличии' : 'Нет в наличии'}
          </span>
        </div>
        
        <div className="mt-auto">
        {isAvailable ? (
          <Button 
            className="w-full bg-secondary hover:bg-yellow-500 text-white rounded-lg py-2 font-medium text-sm sm:text-base transition-colors"
            onClick={addToCart}
          >
            В корзину
          </Button>
        ) : (
          <Button 
            className="w-full bg-primary hover:bg-green-700 text-white rounded-lg py-2 font-medium text-sm sm:text-base transition-colors"
            onClick={subscribeToNotifications}
            disabled={notifying}
          >
            {notifying ? "Подписка..." : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Уведомить о наличии
              </>
            )}
          </Button>
        )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
