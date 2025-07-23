import { Link } from "wouter";

function Hero() {

  return (
    <section className="relative bg-primary text-white py-12 md:py-16 overflow-hidden">
      {/* Background image with opacity */}
      <div 
        className="absolute inset-0 opacity-20" 
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1545241047-6083a3684587?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      ></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <h1 className="heading font-montserrat font-bold text-3xl md:text-4xl lg:text-5xl mb-4">
            Превратите ваш дом в уютные джунгли
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            Доставляем редкие и экзотические растения прямо к вашей двери
          </p>
          
          <Link href="/catalog">
            <button className="bg-secondary hover:bg-yellow-500 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-300 shadow-lg hover:shadow-xl">
              Смотреть каталог
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Hero;
