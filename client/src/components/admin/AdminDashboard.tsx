import { useQuery } from "@tanstack/react-query";
import { 
  ShoppingBag, 
  Users, 
  FileText, 
  MessageSquare,
  DollarSign,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Ошибка загрузки товаров");
      return res.json();
    }
  });
  
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Ошибка загрузки пользователей");
      return res.json();
    }
  });
  
  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders", { credentials: "include" });
      if (!res.ok) throw new Error("Ошибка загрузки заказов");
      return res.json();
    }
  });
  
  const { data: reviews, isLoading: isLoadingReviews } = useQuery({
    queryKey: ["/api/reviews"],
    queryFn: async () => {
      const res = await fetch("/api/reviews", { credentials: "include" });
      if (!res.ok) throw new Error("Ошибка загрузки отзывов");
      return res.json();
    }
  });
  
  // Calculate dashboard metrics
  const totalProducts = products?.length || 0;
  const outOfStockProducts = products?.filter(p => !p.isAvailable)?.length || 0;
  const totalUsers = users?.length || 0;
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(o => o.orderStatus === "pending")?.length || 0;
  const totalReviews = reviews?.length || 0;
  const pendingReviews = reviews?.filter(r => !r.isApproved)?.length || 0;
  
  // Calculate revenue
  const totalRevenue = orders?.reduce((sum, order) => {
    return sum + parseFloat(order.totalAmount);
  }, 0) || 0;
  
  // Prepare chart data for sales by category
  const categorySales = products?.reduce((acc, product) => {
    const category = product.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += 1;
    return acc;
  }, {});
  
  const categoryChartData = categorySales ? Object.keys(categorySales).map(category => ({
    name: category,
    quantity: categorySales[category]
  })) : [];
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Дашборд</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Товары
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ShoppingBag className="w-6 h-6 text-primary mr-2" />
              <div>
                <div className="text-2xl font-bold">{totalProducts}</div>
                <p className="text-xs text-red-500">
                  {outOfStockProducts} нет в наличии
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Пользователи
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="w-6 h-6 text-primary mr-2" />
              <div>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-gray-500">
                  Всего зарегистрировано
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Заказы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="w-6 h-6 text-primary mr-2" />
              <div>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-xs text-amber-500">
                  {pendingOrders} ожидают обработки
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Отзывы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <MessageSquare className="w-6 h-6 text-primary mr-2" />
              <div>
                <div className="text-2xl font-bold">{totalReviews}</div>
                <p className="text-xs text-amber-500">
                  {pendingReviews} на модерации
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Revenue Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Общая выручка
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {totalRevenue.toLocaleString()} ₽
          </div>
          <div className="flex items-center mt-2 text-sm text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>За все время</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Товары по категориям</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">Загрузка данных...</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Недавние действия</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingOrders || isLoadingReviews ? (
            <div className="flex items-center justify-center py-6">
              <p className="text-gray-500">Загрузка данных...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(!orders || orders.length === 0) && (!reviews || reviews.length === 0) ? (
                <div className="flex items-center justify-center py-6">
                  <div className="flex items-center text-gray-500">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <p>Нет недавних действий</p>
                  </div>
                </div>
              ) : (
                <>
                  {orders?.slice(0, 3).map(order => (
                    <div key={order.id} className="flex items-start">
                      <FileText className="w-4 h-4 mt-1 mr-2 text-primary" />
                      <div>
                        <p className="font-medium">Новый заказ #{order.id}</p>
                        <p className="text-sm text-gray-500">
                          {order.fullName} - {parseFloat(order.totalAmount).toLocaleString()} ₽
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {reviews?.slice(0, 3).map(review => (
                    <div key={review.id} className="flex items-start">
                      <MessageSquare className="w-4 h-4 mt-1 mr-2 text-primary" />
                      <div>
                        <p className="font-medium">Новый отзыв - {review.rating} / 5</p>
                        <p className="text-sm text-gray-500">
                          {review.text.substring(0, 50)}
                          {review.text.length > 50 ? "..." : ""}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}