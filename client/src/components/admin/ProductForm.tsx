import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, Product } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, X, Plus } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Расширяем схему с дополнительной валидацией
const productFormSchema = insertProductSchema.extend({
  name: z.string().min(2, "Название должно содержать не менее 2 символов"),
  description: z.string().min(10, "Описание должно содержать не менее 10 символов"),
  category: z.string().min(1, "Выберите категорию"),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Цена должна быть положительным числом",
  }),
  quantity: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
    message: "Количество должно быть неотрицательным числом",
  }),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { toast } = useToast();
  const [imageUrls, setImageUrls] = useState<string[]>(product?.images || []);
  const [newImageUrl, setNewImageUrl] = useState("");
  
  // Настройка формы с начальными данными из переданного товара или значениями по умолчанию
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      category: product?.category || "",
      price: product?.price.toString() || "",
      originalPrice: product?.originalPrice?.toString() || "",
      quantity: product?.quantity.toString() || "0",
      isAvailable: product?.isAvailable ?? true,
      isPreorder: product?.isPreorder ?? false,
      isRare: product?.isRare ?? false,
      isEasyToCare: product?.isEasyToCare ?? false,
      labels: product?.labels || [],
      images: product?.images || [],
    },
  });
  
  // Мутация для создания нового товара
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // Добавляем изображения в данные
      const productData = {
        ...data,
        images: imageUrls,
      };
      
      await apiRequest("POST", "/api/products", productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Товар создан",
        description: "Новый товар успешно добавлен в каталог"
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка создания",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Мутация для обновления существующего товара
  const updateProductMutation = useMutation({
    mutationFn: async (data: { id: number, productData: ProductFormValues }) => {
      // Добавляем изображения в данные
      const productData = {
        ...data.productData,
        images: imageUrls,
      };
      
      await apiRequest("PUT", `/api/products/${data.id}`, productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Товар обновлен",
        description: "Товар успешно обновлен"
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка обновления",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Обработчик отправки формы
  function onSubmit(values: ProductFormValues) {
    if (product) {
      // Обновление существующего товара
      updateProductMutation.mutate({
        id: product.id,
        productData: values
      });
    } else {
      // Создание нового товара
      createProductMutation.mutate(values);
    }
  }
  
  // Добавление нового URL изображения
  const handleAddImage = () => {
    if (newImageUrl && !imageUrls.includes(newImageUrl)) {
      setImageUrls([...imageUrls, newImageUrl]);
      setNewImageUrl("");
    }
  };
  
  // Удаление URL изображения
  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название товара</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите название товара" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Введите описание товара" 
                      rows={5}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Категория</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Комнатные растения">Комнатные растения</SelectItem>
                      <SelectItem value="Суккуленты">Суккуленты</SelectItem>
                      <SelectItem value="Кактусы">Кактусы</SelectItem>
                      <SelectItem value="Папоротники">Папоротники</SelectItem>
                      <SelectItem value="Орхидеи">Орхидеи</SelectItem>
                      <SelectItem value="Семена и рассада">Семена и рассада</SelectItem>
                      <SelectItem value="Аксессуары">Аксессуары</SelectItem>
                      <SelectItem value="Грунты и удобрения">Грунты и удобрения</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена (₽)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="50" 
                        placeholder="0"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="originalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Старая цена (₽)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="50" 
                        placeholder="Если есть скидка"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Оставьте пустым, если нет скидки
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Количество на складе</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      placeholder="0"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Изображения товара</h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {imageUrls.map((url, index) => (
                  <div 
                    key={index} 
                    className="relative w-20 h-20 border rounded overflow-hidden group"
                  >
                    <img 
                      src={url} 
                      alt={`Изображение ${index + 1}`} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=Ошибка";
                      }}
                    />
                    <button 
                      type="button"
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="URL изображения"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  size="icon"
                  onClick={handleAddImage}
                  disabled={!newImageUrl}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-xs text-gray-500">
                Добавьте URL-адреса изображений товара. Первое изображение будет использоваться как основное.
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Характеристики товара</h3>
              
              <FormField
                control={form.control}
                name="isAvailable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Доступен для заказа</FormLabel>
                      <FormDescription>
                        Товар будет отображаться в каталоге как доступный
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isPreorder"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Предзаказ</FormLabel>
                      <FormDescription>
                        Товар доступен только по предзаказу
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isRare"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Редкое растение</FormLabel>
                      <FormDescription>
                        Пометить товар как редкий экземпляр
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isEasyToCare"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Неприхотливое растение</FormLabel>
                      <FormDescription>
                        Отметить, что растение легко в уходе
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Отмена
          </Button>
          <Button 
            type="submit"
            disabled={createProductMutation.isPending || updateProductMutation.isPending}
          >
            {product ? "Сохранить изменения" : "Создать товар"}
          </Button>
        </div>
      </form>
    </Form>
  );
}