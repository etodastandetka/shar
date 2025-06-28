import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, Product } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, X, Plus, Check, ImageIcon } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

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
  const [newCategory, setNewCategory] = useState("");
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Загрузка списка категорий с сервера
  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
    }
  });
  
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
      labels: product?.labels || [],
      images: product?.images || [],
      deliveryCost: product?.deliveryCost?.toString() || "",

      // Флажки для товаров
      isHotDeal: product?.isHotDeal ?? false,
      isBestseller: product?.isBestseller ?? false,
      isNewArrival: product?.isNewArrival ?? false,
      isLimitedEdition: product?.isLimitedEdition ?? false,
    },
  });
  
  // Мутация для создания нового товара
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // Преобразуем данные для отправки на сервер
      const productData = {
        ...data,
        images: imageUrls.length > 0 ? imageUrls : [], // Обеспечиваем, что это массив
        price: parseFloat(data.price), // Преобразуем в число
        originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : undefined,
        quantity: parseInt(data.quantity),
        deliveryCost: data.deliveryCost ? parseFloat(data.deliveryCost) : undefined,
      };
      
      console.log("Sending product data:", productData); // Для отладки
      
      const response = await apiRequest("POST", "/api/products", productData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create product");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Товар создан",
        description: "Новый товар успешно добавлен в каталог"
      });
      onSuccess();
    },
    onError: (error: Error) => {
      console.error("Error creating product:", error);
      toast({
        title: "Ошибка создания товара",
        description: error.message || "Не удалось создать товар. Проверьте данные и попробуйте снова.",
        variant: "destructive"
      });
    }
  });
  
  // Мутация для обновления существующего товара
  const updateProductMutation = useMutation({
    mutationFn: async (data: { id: number, productData: ProductFormValues }) => {
      // Преобразуем данные для отправки на сервер
      const productData = {
        ...data.productData,
        images: imageUrls.length > 0 ? imageUrls : [], // Обеспечиваем, что это массив
        price: parseFloat(data.productData.price), // Преобразуем в число
        originalPrice: data.productData.originalPrice ? parseFloat(data.productData.originalPrice) : undefined,
        quantity: parseInt(data.productData.quantity),
        deliveryCost: data.productData.deliveryCost ? parseFloat(data.productData.deliveryCost) : undefined,
      };
      
      console.log("Updating product data:", productData); // Для отладки
      
      const response = await apiRequest("PUT", `/api/products/${data.id}`, productData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update product");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
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
  
  // Обработчик добавления новой категории
  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      form.setValue("category", newCategory);
      setOpenCategoryPopover(false);
    }
  };
  
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

  // Обработчик загрузки изображений
  const handleImageFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Проверяем количество файлов
    if (files.length > 10) {
      toast({
        title: "Слишком много файлов",
        description: "Можно загрузить максимум 10 изображений за раз",
        variant: "destructive"
      });
      return;
    }

    // Проверяем размер каждого файла
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast({
          title: "Файл слишком большой",
          description: `Файл "${file.name}" превышает 5 МБ`,
          variant: "destructive"
        });
        return;
      }
      
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Неверный тип файла",
          description: `Файл "${file.name}" не является изображением`,
          variant: "destructive"
        });
        return;
      }
    }

    setUploadingImages(true);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("images", files[i]);
      }

      const response = await fetch("/api/upload-images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Ошибка загрузки изображений");
      }

      const result = await response.json();
      
      // Добавляем новые URL к существующим
      setImageUrls(prevUrls => [...prevUrls, ...result.imageUrls]);
      
      toast({
        title: "Изображения загружены",
        description: `Успешно загружено ${result.imageUrls.length} изображений`,
      });

      // Очищаем input
      event.target.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить изображения. Попробуйте снова.",
        variant: "destructive"
      });
    } finally {
      setUploadingImages(false);
    }
  };

  // Обновляем изображения в форме при изменении imageUrls
  useEffect(() => {
    form.setValue("images", imageUrls);
  }, [imageUrls, form]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Левая колонка - основная информация */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Основная информация</h2>
            
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
                      className="min-h-[100px]"
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
                  <div className="flex space-x-2">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                              {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Добавить новую категорию</h4>
                            <p className="text-sm text-muted-foreground">
                              Введите название новой категории
                            </p>
                          </div>
                          <div className="grid gap-2">
                            <Input
                              placeholder="Название категории"
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                            />
                            <Button onClick={handleAddCategory} size="sm">
                              <Check className="h-4 w-4 mr-2" />
                              Добавить
                            </Button>
                          </div>
                        </div>
                    </PopoverContent>
                  </Popover>
                  </div>
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
                        step="0.01"
                        placeholder="0.00"
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
                        step="0.01"
                        placeholder="0.00"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Для отображения скидки
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Количество</FormLabel>
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
              
              <FormField
                control={form.control}
                name="deliveryCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Стоимость доставки (₽)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Настройки товара */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Настройки товара</h3>
              
              <FormField
                control={form.control}
                name="isAvailable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>В наличии</FormLabel>
                      <FormDescription>
                        Товар доступен для покупки
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
            </div>

            {/* Флажки для товаров */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Флажки товара</h3>
              
              <FormField
                control={form.control}
                name="isHotDeal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Горячая цена</FormLabel>
                      <FormDescription>
                        Товар с особенно выгодной ценой
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
                name="isBestseller"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Хит продаж</FormLabel>
                      <FormDescription>
                        Популярный товар, который часто покупают
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
                name="isNewArrival"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Новинка</FormLabel>
                      <FormDescription>
                        Недавно добавленный товар
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
                name="isLimitedEdition"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Ограниченная серия</FormLabel>
                      <FormDescription>
                        Товар в ограниченном количестве
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
          
          {/* Правая колонка - изображения */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Изображения товара</h2>
            
            {/* Загрузка файлов */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageFiles}
                className="hidden"
                id="file-upload"
                disabled={uploadingImages}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-900">
                    {uploadingImages ? "Загрузка..." : "Нажмите для загрузки изображений"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF до 5 МБ каждое
                  </p>
                </div>
              </label>
            </div>
            
            {/* Добавление URL */}
            <div className="flex space-x-2">
              <Input
                placeholder="Или введите URL изображения"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={handleAddImage}
                disabled={!newImageUrl}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Превью изображений */}
            {imageUrls.length > 0 && (
              <div className="space-y-2">
                <Label>Изображения товара ({imageUrls.length})</Label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Изображение ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            {createProductMutation.isPending || updateProductMutation.isPending ? (
              <span className="flex items-center">
                <Upload className="w-4 h-4 mr-2 animate-spin" />
                Сохранение...
              </span>
            ) : product ? "Обновить товар" : "Создать товар"}
          </Button>
        </div>
      </form>
    </Form>
  );
}