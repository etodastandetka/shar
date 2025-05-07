import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Review } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function ReviewsList() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews", { approved: activeTab === "approved" }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const url = `/api/reviews?approved=${params.approved}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Ошибка загрузки отзывов");
      return res.json();
    }
  });
  
  const approveReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest("PUT", `/api/reviews/${reviewId}`, { isApproved: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({
        title: "Отзыв опубликован",
        description: "Отзыв успешно опубликован и будет виден на сайте",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка публикации",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest("DELETE", `/api/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({
        title: "Отзыв удален",
        description: "Отзыв успешно удален из системы",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleApprove = (reviewId: number) => {
    approveReviewMutation.mutate(reviewId);
  };
  
  const handleDelete = (reviewId: number) => {
    if (confirm("Вы уверены, что хотите удалить этот отзыв?")) {
      deleteReviewMutation.mutate(reviewId);
    }
  };
  
  const renderReviews = () => {
    if (isLoading) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-500">Загрузка отзывов...</p>
        </div>
      );
    }
    
    if (!reviews || reviews.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-500">
            {activeTab === "pending" 
              ? "Нет отзывов на модерации" 
              : "Нет опубликованных отзывов"}
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Пользователь ID: {review.userId}</span>
                  <Badge>{review.rating} / 5</Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                {activeTab === "pending" && (
                  <Button 
                    size="sm" 
                    onClick={() => handleApprove(review.id)}
                    disabled={approveReviewMutation.isPending}
                  >
                    Опубликовать
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleDelete(review.id)}
                  disabled={deleteReviewMutation.isPending}
                >
                  Удалить
                </Button>
              </div>
            </div>
            <p className="mb-2">{review.text}</p>
            {review.images && review.images.length > 0 && (
              <div className="flex gap-2 mt-2">
                {review.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Изображение ${index + 1}`}
                    className="w-16 h-16 object-cover rounded"
                  />
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Управление отзывами</h2>
      
      <Tabs 
        defaultValue="pending" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="pending">На модерации</TabsTrigger>
          <TabsTrigger value="approved">Опубликованные</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {renderReviews()}
        </TabsContent>
        
        <TabsContent value="approved">
          {renderReviews()}
        </TabsContent>
      </Tabs>
    </div>
  );
}