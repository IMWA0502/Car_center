import { Component, OnInit, OnDestroy } from '@angular/core';
import { Header } from '../../header/header';
import { Footer } from '../../footer/footer';
import { io, Socket } from 'socket.io-client';
import { CommonModule } from '@angular/common';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-used',
  standalone: true,
  templateUrl: './used.html',
  styleUrl: './used.css',
  imports: [Header, Footer, CommonModule, JsonPipe]
})

export class UsedComponent implements OnInit, OnDestroy {
  private socket!: Socket;
  public autotraderData: any[] = [];

  ngOnInit() {
    this.socket = io('http://localhost:3000');
    this.socket.on('connect', () => {
      console.log('Socket.io connesso!');
    });
    this.socket.on('autotrader-update', (data) => {
      console.log('Ricevuto dal backend:', data);
      this.autotraderData.push(data);
    });
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
