import type { ServerResponse } from "node:http";

export class SseHub {
  private readonly clients = new Set<ServerResponse>();

  addClient(response: ServerResponse): void {
    this.clients.add(response);
  }

  removeClient(response: ServerResponse): void {
    this.clients.delete(response);
  }

  broadcast(event: string, payload: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const client of this.clients) {
      client.write(message);
    }
  }

  closeAll(): void {
    for (const client of this.clients) {
      client.end();
    }

    this.clients.clear();
  }
}
