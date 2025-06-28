import { Link } from "wouter";
import { Sprout, Mail, Clock, MessageCircle } from "lucide-react";
import ExternalLink from "./ExternalLink";

function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Column 1 */}
          <div>
            <h3 className="font-montserrat font-bold text-xl mb-4 flex items-center">
              <Sprout className="h-6 w-6 mr-2 text-secondary" />
              <span>Jungle Plants</span>
            </h3>
            <p className="text-gray-300 mb-4">Превращаем ваш дом в уютные джунгли с 2020 года</p>
            <div className="flex space-x-3">
              <ExternalLink href="https://t.me/helensjungle" className="text-white hover:text-secondary transition-colors">
                <i className="ri-telegram-fill text-xl"></i>
              </ExternalLink>
              <ExternalLink href="https://instagram.com/jungle_plants" className="text-white hover:text-secondary transition-colors">
                <i className="ri-instagram-fill text-xl"></i>
              </ExternalLink>
              <ExternalLink href="https://t.me/helensjungle" className="text-white hover:text-secondary transition-colors">
                <i className="ri-mail-fill text-xl"></i>
              </ExternalLink>
            </div>
          </div>
          
          {/* Column 2 */}
          <div>
            <h3 className="font-montserrat font-bold text-lg mb-4">О нас</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/faq" className="text-gray-300 hover:text-white transition-colors">
                  Доставка и оплата
                </Link>
              </li>
              <li>
                <ExternalLink href="https://telegra.ph/CHasto-zadavaemye-voprosy-o-Dzhunglevom-bote-i-zakupke-07-15" className="text-gray-300 hover:text-white transition-colors">
                  FAQ
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href="https://t.me/junglefeedback" className="text-gray-300 hover:text-white transition-colors">
                  Отзывы
                </ExternalLink>
              </li>
              <li>
                <Link href="/offer" className="text-gray-300 hover:text-white transition-colors">
                  Публичная оферта
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-white transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-white transition-colors">
                  Условия использования
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Column 3 */}
          <div>
            <h3 className="font-montserrat font-bold text-lg mb-4">Основные категории</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/catalog?category=Алоказии" className="text-gray-300 hover:text-white transition-colors">
                  Алоказии
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=Антуриумы" className="text-gray-300 hover:text-white transition-colors">
                  Антуриумы
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=Филодендроны" className="text-gray-300 hover:text-white transition-colors">
                  Филодендроны
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=Разные декоративно-лиственные" className="text-gray-300 hover:text-white transition-colors">
                  Разные декоративно-лиственные
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=Редкие растения" className="text-gray-300 hover:text-white transition-colors">
                  Редкие растения
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Column 4 */}
          <div>
            <h3 className="font-montserrat font-bold text-lg mb-4">Контакты</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                <ExternalLink href="https://t.me/helensjungle" className="text-gray-300 hover:text-white transition-colors">
                  @helensjungle
                </ExternalLink>
              </li>
              <li className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                <ExternalLink href="https://t.me/helensjungle" className="text-gray-300 hover:text-white transition-colors">
                  🪴 Helen's Jungle 🪴
                </ExternalLink>
              </li>
              <li className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                <span className="text-gray-300">Пн-Пт: 10:00 - 19:00</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-6 text-center text-gray-400 text-sm">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-center sm:space-x-6 space-y-1 sm:space-y-0">
              <Link href="/offer" className="text-gray-400 hover:text-white transition-colors">
                Публичная оферта
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Политика конфиденциальности
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Условия использования
              </Link>
            </div>
            <p>© {new Date().getFullYear()} Jungle Plants. Все права защищены.</p>
            <div className="flex flex-col sm:flex-row sm:justify-center sm:space-x-6 space-y-1 sm:space-y-0">
              <span>ИП Коваленко Елена Валерьевна</span>
              <span>ИНН: 236001521940</span>
              <span>ОГРНИП: 325237500241791</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
