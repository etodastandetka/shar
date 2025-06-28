import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function OfferPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-gray-600 hover:text-primary"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        
        <h1 className="heading font-montserrat font-bold text-2xl md:text-3xl ml-4">
          Публичная оферта
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 md:p-8 prose prose-gray max-w-none">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4">Общие положения</h2>
            <p className="text-gray-700 leading-relaxed">
              Настоящая публичная оферта (далее – «Оферта») является официальным предложением интернет-магазина Helen's Jungle, расположенного по адресу helens-jungle.ru (далее – «Продавец»), и регулирует условия продажи комнатных экзотических растений (далее – «Товары»).
            </p>
            <p className="text-gray-700 leading-relaxed">
              Приобретая Товары на сайте helens-jungle.ru, покупатель подтверждает, что ознакомлен с условиями данной Оферты и принимает их полностью и безусловно.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. Предмет оферты</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>1.1.</strong> Продавец обязуется передать Покупателю Товары, указанные на сайте, а Покупатель обязуется оплатить и принять указанные Товары на условиях, установленных данной Офертой.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Цены и порядок оплаты</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>2.1.</strong> Стоимость Товаров указана на сайте в рублях РФ.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>2.2.</strong> Оплата осуществляется в порядке, предусмотренном на сайте, путем безналичного платежа или иным способом, выбранным Покупателем при оформлении заказа.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Доставка</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>3.1.</strong> Доставка Товаров осуществляется по выбранному Покупателем месту (в том числе – пункт выдачи).
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>3.2.</strong> Сроки доставки согласовываются с Покупателем в процессе оформления заказа.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Переход риска и права собственности</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>4.1.</strong> Риск случайной гибели или повреждения Товара переходит к Покупателю с момента передачи Товара в руки Покупателя или уполномоченного им перевозчика.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Условия продажи и возврата</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>5.1.</strong> Товары, указанные на сайте, являются «невозвратными». То есть возврат Товаров по причинам, связанным с их качеством, не осуществляется. Если приобретенные растения (цветы) по каким-то причинам не подходят, по основаниям статьи 25 Закона потребитель не сможет их обменять, а также сдать обратно в магазин, так как растения входят в Перечень непродовольственных товаров надлежащего качества, не подлежащих обмену, утвержденный постановлением Правительства РФ от 31.12.20 г. № 2463 (п.13. Животные и растения).
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>5.2.</strong> В случае повреждения или гибели растений во время транспортировки, покупатель вправе предъявить претензию в течение трех (3) дней с момента прибытия посылки в пункт выдачи.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>5.3.</strong> Возврат денежных средств осуществляется только по следующим случаям:
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>растения погибли по пути следования, за исключением случаев, когда Покупатель осознанно приобретал растения с доставкой при наступлении минусовой температуры, и (или) в случае задержки в продвижении отправления на срок более 14 дней (по вине транспортной компании);</li>
              <li>алоказии, имеющие признаки стволовой гнили.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              <strong>5.4.</strong> Для возврата необходимо связаться с нашими менеджерами и предоставить подтверждающие фотографии поврежденного растения и документа, подтверждающего получение посылки.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Ответственность сторон</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>6.1.</strong> Продавец не несет ответственности за последствия неправильного ухода за растениями после их получения Покупателем.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>6.2.</strong> Все фотографии на сайте являются иллюстративными и могут отличаться от реальных растений по цвету или внешнему виду в связи с особенностями дисплея и вариативностью некоторых видов растений.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Заключительные положения</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>7.1.</strong> Настоящая Оферта вступает в силу с момента ее размещения на сайте и действует до ее отмены или изменения.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>7.2.</strong> Продолжая использование сайта, Покупатель подтверждает согласие со всеми условиями данной Оферты.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Контактная информация</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 leading-relaxed mb-2">
                <strong>Helen's Jungle</strong>
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                Сайт: helens-jungle.ru
              </p>
              <p className="text-gray-700 leading-relaxed">
                Адрес: Г. Кореновск, ул. Железнодорожный дом, д. 5
              </p>
            </div>
          </section>

          <section className="bg-green-50 p-6 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium mb-2">
              Настоящая оферта подтверждает ваше согласие с условиями приобретения растений на сайте helens-jungle.ru
            </p>
            <p className="text-green-700 leading-relaxed mb-2">
              Выбирая наши растения, Вы подтверждаете, что ознакомлены с условиями их возврата и гарантируемой возможностью обращения в случае проблем в течение трех дней после получения.
            </p>
            <p className="text-green-800 font-medium">
              Спасибо за выбор наших растений!
            </p>
            <p className="text-green-800 font-bold mt-2">
              Helen's Jungle
            </p>
          </section>
        </div>
      </div>
    </div>
  );
} 