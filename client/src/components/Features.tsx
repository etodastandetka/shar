import { Sprout, Truck, HeadphonesIcon, Leaf } from "lucide-react";

function Features() {
  return (
    <section className="py-8 md:py-16 bg-neutral-medium">
      <div className="container mx-auto px-4">
        <h2 className="heading font-montserrat font-bold text-2xl md:text-3xl text-center mb-10">
          Почему выбирают нас
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary bg-opacity-10 rounded-full mb-4">
              <Sprout className="h-8 w-8 text-primary" />
            </div>
            <h3 className="heading font-montserrat font-semibold text-lg mb-2">Здоровые растения</h3>
            <p className="text-gray-600">Тщательный отбор и проверка каждого растения перед отправкой</p>
          </div>
          
          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary bg-opacity-10 rounded-full mb-4">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <h3 className="heading font-montserrat font-semibold text-lg mb-2">Безопасная доставка</h3>
            <p className="text-gray-600">Специальная упаковка с утеплением для сохранности растений</p>
          </div>
          
          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary bg-opacity-10 rounded-full mb-4">
              <HeadphonesIcon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="heading font-montserrat font-semibold text-lg mb-2">Поддержка</h3>
            <p className="text-gray-600">Консультации по уходу за растениями после покупки</p>
          </div>
          
          {/* Feature 4 */}
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary bg-opacity-10 rounded-full mb-4">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
            <h3 className="heading font-montserrat font-semibold text-lg mb-2">Редкие экземпляры</h3>
            <p className="text-gray-600">Уникальные и экзотические растения в нашей коллекции</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Features;
