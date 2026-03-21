from main import ProductModel, SessionLocal, Base, engine
import os

def seed_products():
    db = SessionLocal()
    # Recreate tables to be sure
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Correct mapping based on files
    products_data = [
        {"name": "شوكولاتة 'رمضان يجمعنا'", "price_text": "60 حبة بـ 5 دنانير", "image_url": "images/شوكولاتة \"رمضان يجمعا\".png"},
        {"name": "شوكولاتة 'بيستاشيو'", "price_text": "السعر مجهول", "image_url": "images/شوكولاتة \"بيستاشيو\".png"},
        {"name": "شوكولاتة 'رمضان كريم'", "price_text": "60 حبة بـ 5 دنانير", "image_url": "images/شوكولاتة \"رمضان كريم\".png"},
        {"name": "شوكولاتة 'محشي بنكهات مختلفة'", "price_text": "1.5 دينار للحبة", "image_url": "images/شوكولاتة \"محشي بنكهات مختلفة\".png"},
        {"name": "كوكيز نيويورك", "price_text": "السعر مجهول", "image_url": "images/كوكيز نيويورك.png"},
        {"name": "شوكولاتة رخامية", "price_text": "السعر مجهول", "image_url": "images/شوكولاتة رخامية.png"},
        {"name": "بكج 6 حبات كوكيز + صوص شوكولاتة", "price_text": "السعر مجهول", "image_url": "images/بكج 6 حبات كوكيز + صوص شوكولاتة.png"},
        {"name": "شوكولاتة 'ذهب البندق'", "price_text": "السعر مجهول", "image_url": "images/شوكولاتة \"ذهب البندق\".png"},
        {"name": "ليزي كيك بوكس", "price_text": "السعر مجهول", "image_url": "images/ ليزي كيك بوكس.png"},
        {"name": "برالين التوت والشوكولاتة البيضاء", "price_text": "السعر مجهول", "image_url": "images/برالين التوت والشوكولاتة البيضاء.png"},
        {"name": "معمول 'تمر/جوز'", "price_text": "السعر مجهول", "image_url": "images/معمول \"تمر جوز\".png"},
    ]
    
    for p in products_data:
        new_p = ProductModel(**p)
        db.add(new_p)
    
    db.commit()
    db.close()
    print("Database re-seeded with correct Arabic image filenames!")

if __name__ == "__main__":
    seed_products()
