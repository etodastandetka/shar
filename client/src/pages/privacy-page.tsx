import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPage() {
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
          Политика конфиденциальности
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 md:p-8 prose prose-gray max-w-none">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4">Общие положения</h2>
            <p className="text-gray-700 leading-relaxed">
              Настоящая Политика конфиденциальности персональных данных (далее – Политика конфиденциальности) действует в отношении всей информации, размещенной на сайте в сети Интернет по адресу helens-jungle.ru (далее – Сайт), которую могут получить о Пользователе во время использования сайта, его программ и его продуктов.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. Определение терминов</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>1.1.</strong> В настоящей Политике конфиденциальности используются следующие термины:
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li><strong>«Администрация сайта»</strong> (далее – Администрация) – уполномоченные сотрудники на управления сайтом Helen's Jungle, действующие от имени ИП или ООО, которые организуют и (или) осуществляют обработку персональных данных, а также определяет цели обработки персональных данных, состав персональных данных, подлежащих обработке, действия (операции), совершаемые с персональными данными.</li>
              <li><strong>«Персональные данные»</strong> – любая информация, относящаяся к прямо или косвенно определенному, или определяемому физическому лицу (субъекту персональных данных).</li>
              <li><strong>«Обработка персональных данных»</strong> – любое действие (операция) или совокупность действий (операций), совершаемых с использованием средств автоматизации или без использования таких средств с персональными данными, включая сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение персональных данных.</li>
              <li><strong>«Конфиденциальность персональных данных»</strong> – обязательное для соблюдения Администрацией требование не допускать их распространения без согласия субъекта персональных данных или наличия иного законного основания.</li>
              <li><strong>«Пользователь сайта»</strong> (далее Пользователь) – лицо, имеющее доступ к сайту, посредством сети Интернет и использующее информацию, материалы и продукты данного сайта.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Основные права и обязанности Администрации</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>2.1.</strong> Администрация имеет право:
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>изменять правила пользования сайтом, а также изменять содержание данного сайта. Изменения вступают в силу с момента публикации новой редакции Политики на Сайте.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              <strong>2.2.</strong> Администрация обязана:
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>предоставить пользователю возможность ознакомления с настоящей Политикой конфиденциальности;</li>
              <li>использовать полученную информацию исключительно для целей, указанных в п. 4 настоящей Политики конфиденциальности.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Основные права и обязанности Пользователей</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>3.1.</strong> Пользователь имеет право:
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>принимать свободное решение о предоставлении своих персональных данных, необходимых для использования Сайта, и давать согласие на их обработку;</li>
              <li>обновить, дополнить предоставленную информацию о персональных данных в случае изменения данной информации;</li>
              <li>пользователь имеет право на получение у Администрации информации, касающейся обработки его персональных данных, если такое право не ограничено в соответствии с федеральными законами. Пользователь вправе требовать от Администрации уточнения его персональных данных, их блокирования или уничтожения в случае, если персональные данные являются неполными, устаревшими, неточными, незаконно полученными или не являются необходимыми для заявленной цели обработки, а также принимать предусмотренные законом меры по защите своих прав;</li>
              <li>обращаться с жалобами к уполномоченному органу по защите прав субъектов персональных данных или в судебном порядке.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              <strong>3.2.</strong> Пользователь обязан:
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>предоставлять о себе достоверную информацию;</li>
              <li>обновлять, дополнять предоставленную информацию о персональных данных в случае изменения данной информации.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Принципы обработки персональных данных</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>4.1.</strong> Обработка персональных данных осуществляется на законной и справедливой основе.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>4.2.</strong> Обработка персональных данных ограничивается достижением конкретных, заранее определенных и законных целей. Не допускается обработка персональных данных, несовместимая с целями сбора персональных данных.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>4.3.</strong> Не допускается объединение баз данных, содержащих персональные данные, обработка которых осуществляется в целях, несовместимых между собой.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>4.4.</strong> Обработке подлежат только персональные данные, которые отвечают целям их обработки.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Цели обработки персональных данных</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>5.1.</strong> Цель обработки персональных данных пользователей – информирование Пользователя посредством отправки электронных писем; предоставление доступа Пользователю к сервисам, информации и/или материалам, содержащимся на веб-сайте https://helens-jungle.ru.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>5.2.</strong> Также Администрация имеет право направлять Пользователю уведомления о новых продуктах и услугах, специальных предложениях и различных событиях. Пользователь всегда может отказаться от получения информационных сообщений, обратившись к Администрации через доступные каналы связи с пометкой «Отказ от уведомлений о новых продуктах и услугах и специальных предложениях».
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>5.3.</strong> Персональные данные пользователей обрабатываются в следующих целях:
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed">
              <li>обработка заказов и обеспечение доставки товаров;</li>
              <li>связь с покупателем, включая направление уведомлений, запросов и информации, касающихся использования сайта, а также обработка запросов и заявок от покупателя;</li>
              <li>улучшение качества сайта, удобства его использования, разработка новых продуктов и услуг;</li>
              <li>проведение статистических и иных исследований на основе обезличенных данных.</li>
            </ul>
          </section>

          <section className="bg-green-50 p-6 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium mb-2">
              Контактная информация
            </p>
            <p className="text-green-700 leading-relaxed mb-2">
              <strong>Helen's Jungle</strong>
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