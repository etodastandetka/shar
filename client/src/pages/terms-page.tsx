import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsPage() {
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
          Условия использования
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 md:p-8 prose prose-gray max-w-none">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4">Общие положения</h2>
            <p className="text-gray-700 leading-relaxed">
              Настоящие Условия использования (далее – «Условия») регламентируют порядок использования интернет-сайта Helen's Jungle, расположенного по адресу helens-jungle.ru (далее – «Сайт»), и определяют права и обязанности его пользователей и администрации.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Используя Сайт, Пользователь подтверждает, что ознакомился с настоящими Условиями и принимает их полностью и безоговорочно.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. Определения</h2>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li><strong>«Сайт»</strong> – интернет-ресурс Helen's Jungle, расположенный по адресу helens-jungle.ru</li>
              <li><strong>«Администрация»</strong> – уполномоченные лица, осуществляющие управление и модерацию Сайта</li>
              <li><strong>«Пользователь»</strong> – любое физическое лицо, использующее Сайт</li>
              <li><strong>«Контент»</strong> – любые материалы, размещенные на Сайте (тексты, изображения, видео и т.д.)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Права и обязанности Пользователя</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>2.1. Пользователь имеет право:</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>использовать Сайт в соответствии с его назначением</li>
              <li>получать информацию о товарах и услугах, представленных на Сайте</li>
              <li>оформлять заказы на покупку товаров</li>
              <li>обращаться к Администрации по вопросам, связанным с работой Сайта</li>
            </ul>
            
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>2.2. Пользователь обязан:</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>соблюдать настоящие Условия</li>
              <li>предоставлять достоверную информацию при регистрации и оформлении заказов</li>
              <li>не использовать Сайт в целях, противоречащих российскому законодательству</li>
              <li>не нарушать работоспособность Сайта</li>
              <li>не размещать информацию, нарушающую права третьих лиц</li>
              <li>не использовать автоматизированные средства для массового сбора информации с Сайта</li>
            </ul>

            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>2.3. Пользователю запрещается:</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>использовать Сайт для распространения спама, вирусов или вредоносного кода</li>
              <li>выдавать себя за другое лицо или организацию</li>
              <li>нарушать авторские права и интеллектуальную собственность</li>
              <li>размещать контент, содержащий угрозы, оскорбления или дискриминацию</li>
              <li>предпринимать попытки несанкционированного доступа к системе</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Права и обязанности Администрации</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>3.1. Администрация имеет право:</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>изменять содержание Сайта без предварительного уведомления</li>
              <li>ограничивать или прекращать доступ Пользователя к Сайту при нарушении настоящих Условий</li>
              <li>изменять настоящие Условия с уведомлением Пользователей</li>
              <li>собирать статистическую информацию об использовании Сайта</li>
              <li>временно прекращать работу Сайта для проведения технических работ</li>
            </ul>

            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>3.2. Администрация обязана:</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>обеспечивать функционирование Сайта</li>
              <li>принимать меры по защите персональных данных Пользователей</li>
              <li>рассматривать обращения Пользователей в разумные сроки</li>
              <li>предоставлять актуальную информацию о товарах и услугах</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Интеллектуальная собственность</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>4.1.</strong> Все материалы, размещенные на Сайте (тексты, изображения, аудио- и видеофайлы, программное обеспечение и другие объекты), являются объектами исключительных прав Администрации или используются с разрешения правообладателей.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>4.2.</strong> Использование материалов Сайта без письменного согласия правообладателей не допускается.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>4.3.</strong> Название «Helen's Jungle», логотипы и другие средства индивидуализации являются товарными знаками или объектами авторского права Администрации.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Ограничение ответственности</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>5.1.</strong> Администрация не несет ответственности за:
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>временную недоступность Сайта по техническим причинам</li>
              <li>действия Пользователей, нарушающие настоящие Условия или законодательство</li>
              <li>содержание сайтов третьих лиц, на которые могут вести ссылки с Сайта</li>
              <li>ущерб, причиненный Пользователю вследствие неправомерного использования Сайта третьими лицами</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              <strong>5.2.</strong> Сайт предоставляется «как есть». Администрация не гарантирует отсутствие ошибок в работе Сайта или полное соответствие Сайта конкретным целям Пользователя.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Персональные данные</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>6.1.</strong> Обработка персональных данных Пользователей осуществляется в соответствии с Политикой конфиденциальности, размещенной на Сайте.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>6.2.</strong> Предоставляя свои персональные данные, Пользователь соглашается на их обработку в целях, указанных в Политике конфиденциальности.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Изменение Условий</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>7.1.</strong> Администрация оставляет за собой право изменять настоящие Условия в одностороннем порядке.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>7.2.</strong> Изменения вступают в силу с момента их публикации на Сайте.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>7.3.</strong> Продолжение использования Сайта после внесения изменений означает согласие Пользователя с новыми условиями.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Разрешение споров</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>8.1.</strong> Все споры, возникающие в связи с использованием Сайта, решаются путем переговоров между сторонами.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>8.2.</strong> При невозможности разрешения спора путем переговоров, спор подлежит рассмотрению в суде по месту нахождения Администрации.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>8.3.</strong> К отношениям сторон применяется российское законодательство.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Заключительные положения</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>9.1.</strong> Настоящие Условия составляют полное соглашение между Пользователем и Администрацией относительно использования Сайта.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>9.2.</strong> Если какое-либо положение настоящих Условий будет признано недействительным, остальные положения сохраняют свою силу.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>9.3.</strong> Настоящие Условия действуют до их изменения или отзыва Администрацией.
            </p>
          </section>

          <section className="bg-green-50 p-6 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium mb-2">
              Контактная информация
            </p>
            <p className="text-green-700 leading-relaxed mb-2">
              <strong>Helen's Jungle</strong>
            </p>
            <p className="text-green-700 leading-relaxed mb-2">
              Сайт: helens-jungle.ru
            </p>
            <p className="text-green-700 leading-relaxed">
              Адрес: Г. Кореновск, ул. Железнодорожный дом, д. 5
            </p>
          </section>
        </div>
      </div>
    </div>
  );
} 