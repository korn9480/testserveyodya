import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { setupSwagger } from './swagger';
import * as express from 'express';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { ServiceAccount } from "firebase-admin";
import { ConfigService } from '@nestjs/config';

const quotes = document.getElementById('quotes');
const error = document.getElementById('error');

var firebaseConfig = {
  apiKey: 'AIzaSyB7oEYDje93lJI5bA1VKNPX9NVqqcubP1Q',
  authDomain: 'fir-auth-dcb9f.firebaseapp.com',
  projectId: 'fir-auth-dcb9f',
  storageBucket: 'fir-auth-dcb9f.appspot.com',
  messagingSenderId: '793102669717',
  appId: '1:793102669717:web:ff4c646e5b2242f518c89c',
};



async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService: ConfigService = app.get(ConfigService);
  const adminConfig: ServiceAccount = {
    "projectId": configService.get<string>('FIREBASE_PROJECT_ID'),
    "privateKey": configService.get<string>('FIREBASE_PRIVATE_KEY')
                               .replace(/\\n/g, '\n'),
    "clientEmail": configService.get<string>('FIREBASE_CLIENT_EMAIL'),
  };
  // Initialize the firebase admin app
  admin.initializeApp({
    credential: admin.credential.cert(adminConfig),
    databaseURL: "https://xxxxx.firebaseio.com",
  });

  setupSwagger(app);

  app.useGlobalInterceptors(new TransformInterceptor());
  app.enableCors({
    origin: '*',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
      validateCustomDecorators: true,
    }),
  );
  app.use(express.static(path.join(__dirname, '..', 'public')));
  // const configService = app.get(ConfigService);

  const port = configService.get('PORT');
  // await admin.messaging().sendToDevice()
  await app.listen(port,'0.0.0.0', () => {
    console.log(`Application running at ${port}`);
  });
}

bootstrap();
