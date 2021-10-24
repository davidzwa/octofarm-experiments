import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import HomePrinterGrid from "@/views/HomePrinterGrid.vue";
import Printers from "@/views/Printers.vue";
import Settings from "@/views/Settings.vue";
import PrinterGroupsSettings from "@/views/settings/PrinterGroupsSettings.vue";
import About from "@/views/About.vue";
import Scheduling from "@/views/Scheduling.vue";
import HubSettings from "@/views/settings/HubSettings.vue";

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: "/",
    name: "Home",
    component: HomePrinterGrid
  },
  {
    path: "/printers",
    name: "Printers",
    component: Printers
  },
  {
    path: "/settings",
    component: Settings,
    children: [
      {
        path: "",
        redirect: "printer-groups"
      },
      {
        path: "printer-groups",
        component: PrinterGroupsSettings
      },
      {
        path: "system",
        component: HubSettings
      },
      {
        path: "logs",
        component: PrinterGroupsSettings
      }
    ]
  },
  {
    path: "/scheduling",
    name: "Scheduling",
    component: Scheduling
  },
  {
    path: "/about",
    name: "About",
    component: About
  },
  {
    path: "*",
    name: "NotFound",
    component: () => import(/* webpackChunkName: "about" */ "../views/NotFound.vue")
  }
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes
});

export default router;
