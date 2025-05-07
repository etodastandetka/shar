import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Product, InsertProduct } from "@shared/schema";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, X, Upload, Plus, Image } from "lucide-react";

// Product schema for form validation
const productSchema = z.object({
  name: z.string().min(3, "Название должно содержать не менее 3 символов"),
  description: z.string().min(10, "Описание должно содержать не менее 10 символов"),
  price: z.string().min(1, "Введите цену"),
  originalPrice: z.string().optional(),
  quantity: z.string().min(0, "Количество не может быть отрицательным"),
  category: z.string().min(1, "Выберите категорию"),
  isAvailable: z.boolean().default(true),
  isPreorder: z.boolean().default(false),
  deliveryCost: z.string().min(1, "Введите стоимость доставки"),
  labels: z.array(z.string()).default([]),
  images: z.array(z.string()).min(1, "Добавьте хотя бы одно изображение"),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess?: (product: Product) => void;
  onCancel?: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [availableLabels] = useState([
    "Скидка",
    "Без выбора",
    "Растение с фото",
    "Нет в наличии",
    "Редкие",
    "Простой уход"
  ]);
  
  // Initialize the form with product data if editing
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          ...product,
          price: product.price.toString(),
          originalPrice: product.originalPrice?.toString() || "",
          quantity: product.quantity.toString(),
          deliveryCost: product.deliveryCost.toString(),
          labels: product.labels || [],
        }
      : {
          name: "",
          description: "",
          price: "",
          originalPrice: "",
          quantity: "0",
          category: "",
          isAvailable: true,
          isPreorder: false,
          deliveryCost: "300",
          labels: [],
          images: [],
        },
  });

  // Set image URLs if editing
  useEffect(() => {
    if (product && product.images) {
      setImageUrls(product.images);
    }
  }, [product]);

  // Create or update product mutation
  const productMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      if (product) {
        // Update existing product
        const res = await apiRequest("PUT", `/api/products/${product.id}`, data);
        return res.json();
      } else {
        // Create new product
        const res = await apiRequest("POST", "/api/products", data);
        return res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: product ? "Товар обновлен" : "Товар создан",
        description: `Товар "${data.name}" успешно ${product ? "обновлен" : "создан"}`,
      });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Available categories
  const categories = [
    "Крупнолистные",
    "Фикусы",
    "Декоративно-лиственные",
    "Филодендроны",
    "Суккуленты",
    "Вьющиеся",
    "Редкие коллекционные",
    "Кактусы",
    "Пальмы",
    "Папоротники",
  ];

  // Handle form submission
  const onSubmit = (data: ProductFormValues) => {
    // Convert string values to appropriate types
    const formattedData: InsertProduct = {
      ...data,
      price: data.price,
      originalPrice: data.originalPrice || undefined,
      quantity: parseInt(data.quantity),
      deliveryCost: data.deliveryCost,
      images: imageUrls,
    };

    productMutation.mutate(formattedData);
  };

  // Handle image URL addition
  const addImageUrl = (url: string) => {
    if (url && !imageUrls.includes(url)) {
      const updatedUrls = [...imageUrls, url];
      setImageUrls(updatedUrls);
      form.setValue("images", updatedUrls);
    }
  };

  // Handle image URL removal
  const removeImageUrl = (index: number) => {
    const updatedUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updatedUrls);
    form.setValue("images", updatedUrls);
  };

  // Handle label toggle
  const toggleLabel = (label: string) => {
    const currentLabels = form.getValues("labels") || [];
    if (currentLabels.includes(label)) {
      form.setValue(
        "labels",
        currentLabels.filter((l) => l !== label)
      );
    } else {
      form.setValue("labels", [...currentLabels, label]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? "Редактирование товара" : "Новый товар"}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Основная информация</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-32"
                        placeholder="Подробное описание товара"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Pricing & Inventory */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Цена и наличие</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Цена (₽)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" step="0.01" />
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
                          {...field}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Если есть скидка"
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
                        <Input {...field} type="number" min="0" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Количество</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Доступен для заказа
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isPreorder"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Предзаказ
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Labels */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Метки</h3>
              <div className="flex flex-wrap gap-2">
                {availableLabels.map((label) => {
                  const isSelected =
                    form.getValues("labels")?.includes(label) || false;
                  return (
                    <Button
                      key={label}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleLabel(label)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              <FormField
                control={form.control}
                name="labels"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Изображения</h3>
              <div className="grid grid-cols-1 gap-4">
                {/* Image URL Input */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="URL изображения"
                    value=""
                    onChange={(e) => addImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addImageUrl((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.querySelector("input[placeholder='URL изображения']") as HTMLInputElement;
                      if (input.value) {
                        addImageUrl(input.value);
                        input.value = "";
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </div>

                {/* Image Previews */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imageUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative group border rounded-md overflow-hidden"
                    >
                      <img
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Error+Loading+Image";
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImageUrl(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {imageUrls.length === 0 && (
                    <div className="border border-dashed rounded-md p-4 flex flex-col items-center justify-center text-muted-foreground h-32">
                      <Image className="h-8 w-8 mb-2" />
                      <p className="text-sm">Нет изображений</p>
                    </div>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="images"
                  render={() => (
                    <FormItem>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={productMutation.isPending}
            >
              {productMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
