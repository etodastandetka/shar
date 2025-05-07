import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  FileCheck, 
  Truck, 
  CheckCircle, 
  AlertOctagon,
  XCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
type PaymentStatus = "pending" | "pending_verification" | "paid" | "refunded" | "failed";

const ORDER_STATUS_MAP = {
  pending: { label: "Ожидает обработки", color: "text-amber-500", icon: Clock },
  processing: { label: "В обработке", color: "text-blue-500", icon: FileCheck },
  shipped: { label: "Отправлен", color: "text-indigo-500", icon: Truck },
  delivered: { label: "Доставлен", color: "text-green-500", icon: CheckCircle },
  cancelled: { label: "Отменен", color: "text-red-500", icon: XCircle }
};

const PAYMENT_STATUS_MAP = {
  pending: { label: "Ожидает оплаты", color: "text-amber-500", icon: Clock },
  pending_verification: { label: "Проверка оплаты", color: "text-blue-500", icon: AlertOctagon },
  paid: { label: "Оплачен", color: "text-green-500", icon: CheckCircle2 },
  refunded: { label: "Возвращен", color: "text-purple-500", icon: FileCheck },
  failed: { label: "Ошибка оплаты", color: "text-red-500", icon: XCircle }
};

export default function OrdersList() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders", { credentials: "include" });
      if (!res.ok) throw new Error("Ошибка загрузки заказов");
      return res.json();
    }
  });
  
  const updateOrderMutation = useMutation({
    mutationFn: async (data: { id: number, orderData: Partial<Order> }) => {
      await apiRequest("PUT", `/api/orders/${data.id}`, data.orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShowOrderDetails(false);
      toast({
        title: "Заказ обновлен",
        description: "Статус заказа был успешно обновлен"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка обновления",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setAdminComment(order.adminComment || "");
    setOrderStatus(order.orderStatus as OrderStatus || "pending");
    setPaymentStatus(order.paymentStatus as PaymentStatus || "pending");
    setShowOrderDetails(true);
  };
  
  const handleUpdateOrder = () => {
    if (!selectedOrder) return;
    
    updateOrderMutation.mutate({
      id: selectedOrder.id,
      orderData: {
        orderStatus,
        paymentStatus,
        adminComment
      }
    });
  };
  
  const filteredOrders = orders?.filter(order => 
    order.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id.toString().includes(searchQuery) ||
    order.phone.includes(searchQuery)
  );
  
  function formatOrderItems(items: any) {
    try {
      const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
      
      if (Array.isArray(parsedItems)) {
        return parsedItems.map(item => (
          <div key={item.id} className="flex justify-between py-1 border-b border-gray-100 text-sm">
            <div className="flex-1">
              <span>{item.name}</span>
              <span className="text-gray-500 ml-2">x{item.quantity}</span>
            </div>
            <div>
              {parseFloat(item.price).toLocaleString()} ₽
            </div>
          </div>
        ));
      }
      
      return <div className="text-gray-500">Ошибка отображения товаров</div>;
    } catch (e) {
      return <div className="text-gray-500">Ошибка отображения товаров</div>;
    }
  }
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Управление заказами</h2>
      
      <Card className="mb-6">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Поиск заказов по ID, имени клиента или телефону"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>
      
      {isLoading ? (
        <div className="text-center py-10">
          <p className="text-gray-500">Загрузка заказов...</p>
        </div>
      ) : !filteredOrders || filteredOrders.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <p className="text-gray-500">
            {searchQuery 
              ? "Нет заказов, соответствующих поисковому запросу" 
              : "Нет доступных заказов"
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус заказа</TableHead>
                <TableHead>Статус оплаты</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const OrderStatusIcon = ORDER_STATUS_MAP[order.orderStatus as OrderStatus]?.icon || Clock;
                const PaymentStatusIcon = PAYMENT_STATUS_MAP[order.paymentStatus as PaymentStatus]?.icon || Clock;
                
                return (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleSelectOrder(order)}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{new Date(order.createdAt || Date.now()).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.fullName}</div>
                        <div className="text-sm text-gray-500">{order.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{parseFloat(order.totalAmount).toLocaleString()} ₽</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <OrderStatusIcon className={`w-4 h-4 mr-2 ${ORDER_STATUS_MAP[order.orderStatus as OrderStatus]?.color || "text-gray-500"}`} />
                        <span>{ORDER_STATUS_MAP[order.orderStatus as OrderStatus]?.label || "Статус неизвестен"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <PaymentStatusIcon className={`w-4 h-4 mr-2 ${PAYMENT_STATUS_MAP[order.paymentStatus as PaymentStatus]?.color || "text-gray-500"}`} />
                        <span>{PAYMENT_STATUS_MAP[order.paymentStatus as PaymentStatus]?.label || "Статус неизвестен"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectOrder(order);
                        }}
                      >
                        Подробнее
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Заказ #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Создан {selectedOrder && new Date(selectedOrder.createdAt || Date.now()).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Информация о клиенте</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">ФИО: </span>
                    {selectedOrder.fullName}
                  </div>
                  <div>
                    <span className="text-gray-500">Телефон: </span>
                    {selectedOrder.phone}
                  </div>
                  <div>
                    <span className="text-gray-500">Адрес: </span>
                    {selectedOrder.address}
                  </div>
                </div>
                
                <h3 className="font-medium mt-4 mb-2">Информация о доставке</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Тип доставки: </span>
                    {selectedOrder.deliveryType}
                  </div>
                  <div>
                    <span className="text-gray-500">Скорость доставки: </span>
                    {selectedOrder.deliverySpeed}
                  </div>
                  <div>
                    <span className="text-gray-500">Стоимость доставки: </span>
                    {parseFloat(selectedOrder.deliveryAmount).toLocaleString()} ₽
                  </div>
                  <div>
                    <span className="text-gray-500">Нужна холодильная камера: </span>
                    {selectedOrder.needStorage ? "Да" : "Нет"}
                  </div>
                  <div>
                    <span className="text-gray-500">Нужна термоизоляция: </span>
                    {selectedOrder.needInsulation ? "Да" : "Нет"}
                  </div>
                </div>
                
                <h3 className="font-medium mt-4 mb-2">Информация об оплате</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Способ оплаты: </span>
                    {selectedOrder.paymentMethod}
                  </div>
                  <div>
                    <span className="text-gray-500">Статус оплаты: </span>
                    {PAYMENT_STATUS_MAP[selectedOrder.paymentStatus as PaymentStatus]?.label || "Статус неизвестен"}
                  </div>
                  {selectedOrder.paymentProofUrl && (
                    <div>
                      <span className="text-gray-500">Платежное подтверждение: </span>
                      <a 
                        href={selectedOrder.paymentProofUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Посмотреть
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Товары</h3>
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  {formatOrderItems(selectedOrder.items)}
                  <div className="flex justify-between font-medium mt-2 pt-2 border-t border-gray-200">
                    <span>Итого:</span>
                    <span>{parseFloat(selectedOrder.totalAmount).toLocaleString()} ₽</span>
                  </div>
                </div>
                
                <h3 className="font-medium mb-2">Управление заказом</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Статус заказа</label>
                      <Select 
                        value={orderStatus} 
                        onValueChange={(value) => setOrderStatus(value as OrderStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Ожидает обработки</SelectItem>
                          <SelectItem value="processing">В обработке</SelectItem>
                          <SelectItem value="shipped">Отправлен</SelectItem>
                          <SelectItem value="delivered">Доставлен</SelectItem>
                          <SelectItem value="cancelled">Отменен</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Статус оплаты</label>
                      <Select 
                        value={paymentStatus} 
                        onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Ожидает оплаты</SelectItem>
                          <SelectItem value="pending_verification">Проверка оплаты</SelectItem>
                          <SelectItem value="paid">Оплачен</SelectItem>
                          <SelectItem value="refunded">Возвращен</SelectItem>
                          <SelectItem value="failed">Ошибка оплаты</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-gray-500">Комментарий администратора</label>
                    <Textarea 
                      value={adminComment} 
                      onChange={(e) => setAdminComment(e.target.value)} 
                      placeholder="Внутренний комментарий к заказу"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowOrderDetails(false)}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleUpdateOrder}
              disabled={updateOrderMutation.isPending}
            >
              {updateOrderMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}