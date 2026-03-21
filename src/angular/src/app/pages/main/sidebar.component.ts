import {Component, OnInit} from "@angular/core";

import {RouterLink, RouterLinkActive} from "@angular/router";

declare function require(moduleName: string): { version: string };
const { version: appVersion } = require("../../../../package.json");

import {ROUTE_INFOS} from "../../routes";
import {ServerCommandService} from "../../services/server/server-command.service";
import {LoggerService} from "../../services/utils/logger.service";
import {ConnectedService} from "../../services/utils/connected.service";
import {StreamServiceRegistry} from "../../services/base/stream-service.registry";

@Component({
    selector: "app-sidebar",
    templateUrl: "./sidebar.component.html",
    styleUrls: ["./sidebar.component.scss"],
    standalone: true,
    imports: [RouterLink, RouterLinkActive]
})
export class SidebarComponent implements OnInit {
    routeInfos = ROUTE_INFOS;

    public commandsEnabled: boolean;
    public version: string;

    private _connectedService: ConnectedService;

    constructor(private _logger: LoggerService,
                _streamServiceRegistry: StreamServiceRegistry,
                private _commandService: ServerCommandService) {
        this._connectedService = _streamServiceRegistry.connectedService;
        this.commandsEnabled = false;
        this.version = appVersion;
    }

    // noinspection JSUnusedGlobalSymbols
    ngOnInit(): void {
        this._connectedService.connected.subscribe({
            next: (connected: boolean) => {
                this.commandsEnabled = connected;
            }
        });
    }

    onCommandRestart(): void {
        this._commandService.restart().subscribe({
            next: reaction => {
                if (reaction.success) {
                    this._logger.info(reaction.data);
                } else {
                    this._logger.error(reaction.errorMessage);
                }
            }
        });
    }
}
